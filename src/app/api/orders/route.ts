import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimit, getClientIp, acquireConcurrentSlot, releaseConcurrentSlot } from "@/lib/rate-limit";
import { orderLimiter } from "@/lib/request-queue";
import { orderCircuitBreaker } from "@/lib/circuit-breaker";
import { z } from "zod";
import { sendOrderNotification } from "@/lib/mailer";

const createOrderSchema = z.object({
  studentId: z.string().min(1).max(20).trim(),
  studentName: z.string().max(50).nullable().optional(),
  className: z.string().max(30).nullable().optional(),
  department: z.enum(["breakfast", "lunch"]),
  note: z.string().max(200).nullable().optional(),
  pickupDate: z.string().max(20).nullable().optional(),
  pickupTime: z.string().max(20).nullable().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1).max(50),
        name: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(20),
        price: z.number().int().min(0).max(10000),
      })
    )
    .min(1)
    .max(30),
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

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Verify student is registered
    if (data.studentId) {
      const studentDoc = await adminDb.collection("students").doc(data.studentId).get();
      if (!studentDoc.exists) {
        return NextResponse.json(
          { error: "學生身分未驗證，請先註冊帳號" },
          { status: 403 }
        );
      }
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
        // Re-read menu items inside transaction for stock check
        const freshMenuDocs = await Promise.all(
          menuRefs.map((ref) => tx.get(ref))
        );

        // Check stock availability
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

        const counterDoc = await tx.get(counterRef);
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

      // Send order confirmation email
      try {
        const studentDoc = await adminDb.collection("students").doc(data.studentId).get();
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
      } catch (emailErr) {
        console.error("Order confirmation email error:", emailErr);
      }

      return NextResponse.json(result, { status: 201 });
    } finally {
      orderLimiter.release();
    }
  } catch (err) {
    // Stock/soldOut errors are user-facing
    if (err instanceof Error && (err.message.startsWith("庫存不足") || err.message.startsWith("已售罄"))) {
      return NextResponse.json({ error: err.message }, { status: 400 });
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

    let q: FirebaseFirestore.Query = adminDb.collection("orders");
    if (department) q = q.where("department", "==", department);

    const snap = await q.get();

    // Filter to today's orders in JS (avoid composite index requirement)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let orders = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      };
    }).filter((o: Record<string, unknown>) => {
      const created = new Date(o.createdAt as string);
      return created >= todayStart;
    });

    if (status) {
      orders = orders.filter((o: Record<string, unknown>) => o.status === status);
    }

    orders.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    );

    return NextResponse.json(orders);
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
