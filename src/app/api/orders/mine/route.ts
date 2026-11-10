import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireStudent } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

/** The signed-in student's recent orders (newest first, max 50). */
export async function GET() {
  const s = await requireStudent();
  if (s instanceof NextResponse) return s;
  if (!rateLimit(`orders-mine:${s.studentId}`, 60, 60 * 1000).allowed) {
    return NextResponse.json({ error: "請稍後再試" }, { status: 429 });
  }
  try {
    const snap = await adminDb.collection("orders").where("studentId", "==", s.studentId).get();
    const orders = snap.docs
      .map((d) => {
        const o = d.data();
        return {
          id: d.id,
          orderNumber: o.orderNumber,
          department: o.department,
          status: o.status,
          totalPrice: o.totalPrice,
          paymentMethod: o.paymentMethod || "cash",
          pickupTime: o.pickupTime || null,
          itemCount: (o.items || []).reduce((n: number, i: { quantity: number }) => n + i.quantity, 0),
          firstItem: o.items?.[0]?.name || "",
          createdAt: o.createdAt?.toDate?.()?.toISOString?.() ?? null,
        };
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 50);
    return NextResponse.json(orders, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/orders/mine error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
