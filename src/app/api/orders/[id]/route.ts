import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getSession, getStudentSession, requireAdmin } from "@/lib/auth";
import { ADMIN_STATUSES, changeOrderStatus, OrderError, publicOrderView, type OrderStatus } from "@/lib/orders";
import { notifyOrderStatus } from "@/lib/order-notify";
import { auditLog } from "@/lib/security";

const ID = /^[a-zA-Z0-9]{10,30}$/;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const snap = await adminDb.collection("orders").doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = snap.data()!;

    const [admin, student] = await Promise.all([getSession(), getStudentSession()]);
    const isOwner = !!student && student.studentId === data.studentId;
    if (admin || isOwner) {
      return NextResponse.json(
        {
          id: snap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
          paymentAttempts: undefined,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(publicOrderView(snap.id, data), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/orders/[id] error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

const patchSchema = z.object({
  status: z.enum(ADMIN_STATUSES as [OrderStatus, ...OrderStatus[]]),
  reason: z.string().max(200).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    if (!ID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    const r = await changeOrderStatus(id, parsed.data.status, auth.username, parsed.data.reason);
    if (r.from !== r.to) {
      if (r.to === "cancelled" || r.refunded > 0) {
        await auditLog({ actor: auth.username, action: "order.cancel", target: id, detail: { from: r.from, refunded: r.refunded } });
      }
      await notifyOrderStatus(id, r.order, r.to, r.refunded);
    }
    return NextResponse.json({ id, status: r.to, refunded: r.refunded });
  } catch (err) {
    if (err instanceof OrderError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("PATCH /api/orders/[id] error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
