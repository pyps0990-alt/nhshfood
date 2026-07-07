import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimit, getClientIp, acquireConcurrentSlot, releaseConcurrentSlot } from "@/lib/rate-limit";
import { orderLimiter } from "@/lib/request-queue";
import { orderCircuitBreaker } from "@/lib/circuit-breaker";
import { isWithinSchool } from "@/lib/geo";
import { z } from "zod";
import { sendOrderNotification } from "@/lib/mailer";
import { getStudentSession } from "@/lib/auth";

const createOrderSchema = z.object({
  studentId: z.string().min(1).max(20).trim(),
  studentName: z.string().max(50).nullable().optional(),
  className: z.string().max(30).nullable().optional(),
  department: z.enum(["breakfast", "lunch"]),
  note: z.string().max(200).nullable().optional(),
  paymentMethod: z.enum(["cash", "wallet"]).default("cash"),
  pickupDate: z.string().max(20).nullable().optional(),
  pickupTime: z.string().max(20).nullable().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1).max(50),
        name: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(999),
        price: z.number().int().min(0).max(10000),
      })
    )
    .min(1)
    .max(30),
  coords: z
    .object({
      lat: z.number().gte(-90).lte(90),
      lng: z.number().gte(-180).lte(180),
    })
    .nullable()
    .optional(),
});

export async function POST(req: NextRequest) {
  // Circuit breaker: fail fast if Firestore is down
  if (!orderCircuitBreaker.canRequest()) {
    return NextResponse.json(
      { error: "系統忙碌中，請稍後再試" },
      { status: 503 }
    );
  }

  // Global concurrent request limit
  if (!acquireConcurrentSlot()) {
    return NextResponse.json(
      { error: "系統忙碌中，請稍後再試" },
      { status: 503 }
    );
  }

  try {
    // Rate limit: max 5 orders per IP per 5 minutes
    const ip = getClientIp(req);
    const { allowed, remaining } = rateLimit(ip, 5, 5 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "訂單送出太頻繁，請稍後再試" },
        {
          status: 429,
          headers: { "X-RateLimit-Remaining": String(remaining) },
        }
      );
    }

    // Identity must come from the session cookie, NOT the request body.
    // Trusting body.studentId would let anyone place orders as anyone else
    // via a simple localStorage edit + cash payment.
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Override any client-supplied studentId with the authenticated one.
    const data = { ...parsed.data, studentId: session.studentId };

    // Verify the authenticated student's record still exists (e.g. wasn't
    // deleted mid-session by admin).
    const studentDoc = await adminDb.collection("students").doc(data.studentId).get();
    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: "帳號不存在或已被停用" },
        { status: 403 }
      );
    }
    // Also override display fields from the server-side record so a
    // spoofed studentName / className in the body can't attach false
    // labels to the receipt.
    const authoritative = studentDoc.data()!;
    data.studentName = authoritative.studentName || data.studentName || null;
    data.className = authoritative.className || data.className || null;

    // Location gate: always read the *current* app-config on the server so an
    // admin toggling `requireLocation` takes effect on the very next order,
    // regardless of any client-side or CDN cached copy.
    try {
      const cfgSnap = await adminDb.collection("settings").doc("app-config").get();
      const requireLocation = cfgSnap.exists ? cfgSnap.data()?.requireLocation !== false : true;
      if (requireLocation) {
        if (!data.coords) {
          return NextResponse.json(
            { error: "請允許定位權限以確認您在校園內" },
            { status: 403 }
          );
        }
        if (!isWithinSchool(data.coords.lat, data.coords.lng)) {
          return NextResponse.json(
            { error: "請在校園範圍內下單" },
            { status: 403 }
          );
        }
      }
    } catch (err) {
      console.error("Location gate check failed:", err);
      // Fail closed rather than open — if we can't verify, don't accept the order.
      return NextResponse.json(
        { error: "系統暫時無法驗證位置，請稍後再試" },
        { status: 503 }
      );
    }

    // Per-student rate limit: max 3 orders per student per 5 minutes
    const studentRl = rateLimit(`student:${data.studentId}`, 3, 5 * 60 * 1000);
    if (!studentRl.allowed) {
      return NextResponse.json(
        { error: "同一學號訂單送出太頻繁，請稍後再試" },
        { status: 429 }
      );
    }

    // Sanitize strings
    const sanitize = (s: string | null | undefined) =>
      s ? s.replace(/[<>]/g, "").trim() : null;

    // Batch-read all menu items in a single Firestore call
    const menuRefs = data.items.map((item) =>
      adminDb.collection("menuItems").doc(item.menuItemId)
    );
    const menuDocs = await adminDb.getAll(...menuRefs);

    const verifiedItems: { menuItemId: string; name: string; quantity: number; price: number }[] = [];
    let totalPrice = 0;

    for (let i = 0; i < data.items.length; i++) {
      const menuDoc = menuDocs[i];
      if (!menuDoc.exists) {
        return NextResponse.json(
          { error: `品項不存在: ${data.items[i].name}` },
          { status: 400 }
        );
      }
      const menuData = menuDoc.data()!;
      if (!menuData.available) {
        return NextResponse.json(
          { error: `品項已停售: ${menuData.name}` },
          { status: 400 }
        );
      }
      verifiedItems.push({
        menuItemId: data.items[i].menuItemId,
        name: menuData.name,
        quantity: data.items[i].quantity,
        price: menuData.price,
      });
      totalPrice += menuData.price * data.items[i].quantity;
    }

    // Acquire concurrency slot
    await orderLimiter.acquire();

    try {
      // Atomic order number via Firestore transaction
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayDate = `${yyyy}${mm}${dd}`;

      const counterRef = adminDb.collection("counters").doc("orderNumber");

      const result = await adminDb.runTransaction(async (tx) => {
        // === ALL READS FIRST (Firestore requirement) ===
        const freshMenuDocs = await Promise.all(
          menuRefs.map((ref) => tx.get(ref))
        );
        const counterDoc = await tx.get(counterRef);

        let walletSnap: FirebaseFirestore.DocumentSnapshot | null = null;
        const walletRef = data.paymentMethod === "wallet"
          ? adminDb.collection("wallets").doc(data.studentId)
          : null;
        if (walletRef) {
          walletSnap = await tx.get(walletRef);
        }

        // === VALIDATION ===
        for (let i = 0; i < data.items.length; i++) {
          const menuData = freshMenuDocs[i].data()!;
          if (menuData.stock !== null && menuData.stock !== undefined) {
            if (menuData.stock < data.items[i].quantity) {
              throw new Error(`庫存不足: ${menuData.name}（剩餘 ${menuData.stock} 份）`);
            }
          }
          if (menuData.soldOut) {
            throw new Error(`已售罄: ${menuData.name}`);
          }
        }

        if (data.paymentMethod === "wallet") {
          if (!walletSnap || !walletSnap.exists) {
            throw new Error("WALLET_NOT_FOUND");
          }
          const wallet = walletSnap.data()!;
          if (wallet.balance < totalPrice) {
            throw new Error("INSUFFICIENT_BALANCE");
          }
        }

        // === ALL WRITES ===

        // Wallet deduction
        if (data.paymentMethod === "wallet" && walletRef && walletSnap) {
          const wallet = walletSnap.data()!;
          const newBalance = wallet.balance - totalPrice;
          tx.update(walletRef, { balance: newBalance, updatedAt: new Date().toISOString() });

          const walletTxRef = adminDb.collection("wallet_transactions").doc();
          tx.set(walletTxRef, {
            studentId: data.studentId,
            amount: -totalPrice,
            type: "payment",
            method: "wallet",
            note: null,
            balanceAfter: newBalance,
            createdAt: new Date().toISOString(),
            createdBy: data.studentId,
          });
        }

        // Decrement stock
        for (let i = 0; i < data.items.length; i++) {
          const menuData = freshMenuDocs[i].data()!;
          if (menuData.stock !== null && menuData.stock !== undefined) {
            const newStock = menuData.stock - data.items[i].quantity;
            const updates: Record<string, unknown> = { stock: newStock };
            if (newStock <= 0) {
              updates.soldOut = true;
              updates.available = false;
            }
            tx.update(menuRefs[i], updates);
          }
        }

        // Order number
        let seq = 1;
        if (counterDoc.exists) {
          const counterData = counterDoc.data()!;
          if (counterData.date === todayDate) {
            seq = (counterData.seq || 0) + 1;
          }
        }
        tx.set(counterRef, { date: todayDate, seq });

        const orderNumber = `${todayDate}${String(seq).padStart(4, "0")}`;

        const orderRef = adminDb.collection("orders").doc();
        tx.set(orderRef, {
          studentId: sanitize(data.studentId)!,
          studentName: sanitize(data.studentName),
          className: sanitize(data.className),
          department: data.department,
          note: sanitize(data.note),
          paymentMethod: data.paymentMethod,
          pickupDate: sanitize(data.pickupDate),
          pickupTime: sanitize(data.pickupTime),
          totalPrice,
          status: "pending",
          orderNumber,
          items: verifiedItems,
          createdAt: FieldValue.serverTimestamp(),
        });

        return { id: orderRef.id, orderNumber };
      });

      orderCircuitBreaker.recordSuccess();

      // Send order confirmation based on notification preference
      try {
        const studentDoc = await adminDb.collection("students").doc(data.studentId).get();
        const notifyMethod = studentDoc.exists ? (studentDoc.data()?.notifyMethod || "email") : "email";

        if (notifyMethod === "email" || !notifyMethod) {
          const studentEmail = studentDoc.exists ? studentDoc.data()?.email : null;
          if (studentEmail) {
            await sendOrderNotification({
              to: studentEmail,
              studentName: sanitize(data.studentName) || "",
              orderNumber: result.orderNumber,
              status: "pending",
              department: data.department,
              items: verifiedItems,
              totalPrice,
            });
          }
        }
      } catch (notifyErr) {
        console.error("Order confirmation notification error:", notifyErr);
      }

      return NextResponse.json(result, { status: 201 });
    } finally {
      orderLimiter.release();
    }
  } catch (err) {
    // Stock/soldOut errors are user-facing
    if (err instanceof Error) {
      if (err.message.startsWith("庫存不足") || err.message.startsWith("已售罄")) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err.message === "WALLET_NOT_FOUND") {
        return NextResponse.json({ error: "找不到錢包，請先開通錢包" }, { status: 404 });
      }
      if (err.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ error: "錢包餘額不足" }, { status: 400 });
      }
    }
    orderCircuitBreaker.recordFailure();
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  } finally {
    releaseConcurrentSlot();
  }
}

export async function GET(req: NextRequest) {
  try {
    const department = req.nextUrl.searchParams.get("department");
    const status = req.nextUrl.searchParams.get("status");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Use createdAt >= todayStart to only read today's orders from Firestore
    let q: FirebaseFirestore.Query = adminDb
      .collection("orders")
      .where("createdAt", ">=", todayStart);

    const snap = await q.get();

    let orders = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      };
    });

    // Filter by department and status in JS (avoids composite index)
    if (department) {
      orders = orders.filter((o: Record<string, unknown>) => o.department === department);
    }
    if (status) {
      orders = orders.filter((o: Record<string, unknown>) => o.status === status);
    }

    orders.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    );

    return NextResponse.json(orders, {
      headers: { "Cache-Control": "private, max-age=5" },
    });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
