import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { rateLimit, getClientIp, acquireConcurrentSlot, releaseConcurrentSlot } from "@/lib/rate-limit";
import { orderLimiter } from "@/lib/request-queue";
import { orderCircuitBreaker } from "@/lib/circuit-breaker";
import { isWithinSchool } from "@/lib/geo";
import { getSession, getStudentSession, requireAdmin } from "@/lib/auth";
import { createOrder, expireStalePaymentOrders, OrderError } from "@/lib/orders";
import { notifyOrderStatus } from "@/lib/order-notify";
import { createOrderPayment, onlinePaymentEnabled } from "@/lib/payments/service";
import { taipeiStartOfDay } from "@/lib/time";

const createOrderSchema = z.object({
  // Identity fields from the client are ignored; kept optional for old clients.
  studentId: z.string().max(20).optional(),
  studentName: z.string().max(50).nullable().optional(),
  className: z.string().max(30).nullable().optional(),
  department: z.enum(["breakfast", "lunch"]),
  note: z.string().max(200).nullable().optional(),
  paymentMethod: z.enum(["cash", "wallet", "ecpay"]).default("cash"),
  pickupDate: z.string().max(20).nullable().optional(),
  pickupTime: z.string().max(20).nullable().optional(),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{8,64}$/).nullable().optional(),
  pos: z.boolean().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().regex(/^[A-Za-z0-9]{1,50}$/),
        // name/price from the client are ignored; server uses the menu.
        name: z.string().max(100).optional(),
        quantity: z.number().int().min(1).max(20),
        price: z.number().optional(),
      })
    )
    .min(1)
    .max(30),
  coords: z.object({ lat: z.number().gte(-90).lte(90), lng: z.number().gte(-180).lte(180) }).nullable().optional(),
});

function errorResponse(err: unknown) {
  if (err instanceof OrderError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  return null;
}

export async function POST(req: NextRequest) {
  if (!orderCircuitBreaker.canRequest()) {
    return NextResponse.json({ error: "系統忙碌中，請稍後再試" }, { status: 503 });
  }
  if (!acquireConcurrentSlot()) {
    return NextResponse.json({ error: "系統忙碌中，請稍後再試" }, { status: 503 });
  }

  try {
    const parsed = createOrderSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "資料格式錯誤" }, { status: 400 });
    }
    const data = parsed.data;

    // ── POS (cashier) orders: admin session, cash only, no location gate ──
    if (data.pos) {
      const admin = await getSession();
      if (!admin) return NextResponse.json({ error: "請先登入管理員帳號" }, { status: 401 });
      await orderLimiter.acquire();
      try {
        const result = await createOrder({
          studentId: "POS",
          studentName: "現場點餐",
          className: null,
          department: data.department,
          note: data.note ?? null,
          paymentMethod: "cash",
          pickupDate: null,
          pickupTime: null,
          items: data.items,
          source: "pos",
          createdBy: admin.username,
          idempotencyKey: data.idempotencyKey,
        });
        orderCircuitBreaker.recordSuccess();
        return NextResponse.json(result, { status: 201 });
      } finally {
        orderLimiter.release();
      }
    }

    // ── Student orders ──
    const session = await getStudentSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 401 });

    // A whole school can share one public IP — keep the IP limit generous and
    // rely on the per-student limit for fairness.
    const ip = getClientIp(req);
    if (!rateLimit(`order-ip:${ip}`, 600, 5 * 60 * 1000).allowed) {
      return NextResponse.json({ error: "系統忙碌中，請稍後再試" }, { status: 429 });
    }
    if (!rateLimit(`order-student:${session.studentId}`, 5, 5 * 60 * 1000).allowed) {
      return NextResponse.json({ error: "下單太頻繁，請稍後再試" }, { status: 429 });
    }

    if (data.paymentMethod === "ecpay" && !onlinePaymentEnabled()) {
      return NextResponse.json({ error: "線上付款尚未開放" }, { status: 400 });
    }

    const studentDoc = await adminDb.collection("students").doc(session.studentId).get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "帳號不存在或已被停用" }, { status: 403 });
    }
    const student = studentDoc.data()!;

    // Location gate — read live config (fail closed).
    try {
      const cfgSnap = await adminDb.collection("settings").doc("app-config").get();
      const requireLocation = cfgSnap.exists ? cfgSnap.data()?.requireLocation !== false : true;
      if (requireLocation) {
        if (!data.coords) return NextResponse.json({ error: "請允許定位權限以確認您在校園內" }, { status: 403 });
        if (!isWithinSchool(data.coords.lat, data.coords.lng)) {
          return NextResponse.json({ error: "請在校園範圍內下單" }, { status: 403 });
        }
      }
    } catch (err) {
      console.error("Location gate check failed:", err);
      return NextResponse.json({ error: "系統暫時無法驗證位置，請稍後再試" }, { status: 503 });
    }

    await orderLimiter.acquire();
    let result;
    try {
      result = await createOrder({
        studentId: session.studentId,
        studentName: student.studentName || null,
        className: student.className || null,
        department: data.department,
        note: data.note ?? null,
        paymentMethod: data.paymentMethod,
        pickupDate: data.pickupDate ?? null,
        pickupTime: data.pickupTime ?? null,
        items: data.items,
        source: "student",
        createdBy: session.studentId,
        idempotencyKey: data.idempotencyKey,
      });
      orderCircuitBreaker.recordSuccess();
    } finally {
      orderLimiter.release();
    }

    let redirectUrl: string | null = null;
    if (result.status === "awaiting_payment") {
      const mtn = await createOrderPayment(result.id, session.studentId);
      redirectUrl = `/api/payments/ecpay/redirect/${mtn}`;
    } else if (!result.replayed) {
      const snap = await adminDb.collection("orders").doc(result.id).get();
      if (snap.exists) await notifyOrderStatus(result.id, snap.data()!, "pending");
    }

    return NextResponse.json(
      { id: result.id, orderNumber: result.orderNumber, totalPrice: result.totalPrice, status: result.status, redirectUrl },
      { status: 201 }
    );
  } catch (err) {
    const known = errorResponse(err);
    if (known) return known;
    orderCircuitBreaker.recordFailure();
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  } finally {
    releaseConcurrentSlot();
  }
}

/** Admin order feed (today, Taipei time). Replaces the client-SDK listener. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    expireStalePaymentOrders().catch((e) => console.error("expiry sweep", e));

    const department = req.nextUrl.searchParams.get("department");
    const status = req.nextUrl.searchParams.get("status");
    const includeUnpaid = req.nextUrl.searchParams.get("includeUnpaid") === "1";

    const snap = await adminDb.collection("orders").where("createdAt", ">=", taipeiStartOfDay()).get();

    let orders = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        confirmedAt: data.confirmedAt?.toDate?.()?.toISOString?.() ?? null,
        readyAt: data.readyAt?.toDate?.()?.toISOString?.() ?? null,
        pickedUpAt: data.pickedUpAt?.toDate?.()?.toISOString?.() ?? null,
        cancelledAt: data.cancelledAt?.toDate?.()?.toISOString?.() ?? null,
      } as unknown as Record<string, unknown> & { createdAt: string; department: string; status: string };
    });

    // Kitchen shouldn't see orders whose online payment hasn't completed.
    if (!includeUnpaid) orders = orders.filter((o) => o.status !== "awaiting_payment" && o.status !== "payment_failed");
    if (department) orders = orders.filter((o) => o.department === department);
    if (status && status !== "all") orders = orders.filter((o) => o.status === status);
    orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json(orders, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
