import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID format (prevent injection)
    if (!/^[a-zA-Z0-9]{10,30}$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const snap = await adminDb.collection("orders").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = snap.data()!;
    return NextResponse.json({
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    });
  } catch (err) {
    console.error("GET /api/orders/[id] error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only admins can update order status
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const { id } = await params;
    if (!/^[a-zA-Z0-9]{10,30}$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    const validStatuses = ["pending", "confirmed", "ready", "picked_up", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await adminDb.collection("orders").doc(id).update({ status });
    return NextResponse.json({ id, status });
  } catch (err) {
    console.error("PATCH /api/orders/[id] error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
