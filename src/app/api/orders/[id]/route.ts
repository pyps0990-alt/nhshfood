import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { sendOrderNotification } from "@/lib/mailer";

async function findEmailByStudentId(studentId: string): Promise<string | null> {
  const doc = await adminDb.collection("students").doc(studentId).get();
  if (doc.exists) return doc.data()?.email || null;
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const orderDoc = await adminDb.collection("orders").doc(id).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
    }
    const orderData = orderDoc.data()!;

    await adminDb.collection("orders").doc(id).update({ status });

    // Send email synchronously (await) so Vercel doesn't kill the function early
    if (["confirmed", "ready", "cancelled"].includes(status)) {
      try {
        const email = await findEmailByStudentId(orderData.studentId);
        if (email) {
          const result = await sendOrderNotification({
            to: email,
            studentName: orderData.studentName || "",
            orderNumber: orderData.orderNumber,
            status,
            department: orderData.department,
            items: orderData.items,
            totalPrice: orderData.totalPrice,
          });
          console.log("Email send result:", result);
        } else {
          console.log("No email found for student:", orderData.studentId);
        }
      } catch (err) {
        console.error("Email notification error:", err);
      }
    }

    return NextResponse.json({ id, status });
  } catch (err) {
    console.error("PATCH /api/orders/[id] error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
