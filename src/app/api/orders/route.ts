import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const createOrderSchema = z.object({
  studentId: z.string().min(1).max(20).trim(),
  studentName: z.string().max(50).nullable().optional(),
  className: z.string().max(30).nullable().optional(),
  department: z.enum(["breakfast", "lunch"]),
  note: z.string().max(200).nullable().optional(),
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

    // Sanitize strings
    const sanitize = (s: string | null | undefined) =>
      s ? s.replace(/[<>]/g, "").trim() : null;

    // Verify menu items exist and prices match
    const menuRef = adminDb.collection("menuItems");
    const verifiedItems = [];
    let totalPrice = 0;

    for (const item of data.items) {
      const menuDoc = await menuRef.doc(item.menuItemId).get();
      if (!menuDoc.exists) {
        return NextResponse.json({ error: `品項不存在: ${item.name}` }, { status: 400 });
      }
      const menuData = menuDoc.data()!;
      if (!menuData.available) {
        return NextResponse.json({ error: `品項已停售: ${menuData.name}` }, { status: 400 });
      }
      // Use server-side price (not client-submitted price) to prevent price tampering
      verifiedItems.push({
        menuItemId: item.menuItemId,
        name: menuData.name,
        quantity: item.quantity,
        price: menuData.price,
      });
      totalPrice += menuData.price * item.quantity;
    }

    // Generate order number: YYYYMMDDSSSS (resets daily)
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const datePrefix = `${yyyy}${mm}${dd}`;

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const ordersRef = adminDb.collection("orders");
    const todaySnap = await ordersRef
      .where("createdAt", ">=", todayStart)
      .get();
    const seq = String(todaySnap.size + 1).padStart(4, "0");
    const orderNumber = `${datePrefix}${seq}`;

    const docRef = await ordersRef.add({
      studentId: sanitize(data.studentId)!,
      studentName: sanitize(data.studentName),
      className: sanitize(data.className),
      department: data.department,
      note: sanitize(data.note),
      pickupTime: sanitize(data.pickupTime),
      totalPrice,
      status: "pending",
      orderNumber,
      items: verifiedItems,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id, orderNumber }, { status: 201 });
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const department = req.nextUrl.searchParams.get("department");
    const status = req.nextUrl.searchParams.get("status");

    let q: FirebaseFirestore.Query = adminDb.collection("orders");
    if (department) q = q.where("department", "==", department);

    const snap = await q.get();
    let orders = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      };
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
