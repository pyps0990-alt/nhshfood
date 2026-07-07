import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { studentId, subscription } = await req.json();

    if (!studentId || !subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await adminDb.collection("push_subscriptions").doc(studentId).set({
      subscription,
      updatedAt: new Date(),
    });

    await adminDb.collection("students").doc(studentId).update({
      notifyMethod: "push",
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/push/subscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { studentId, notifyMethod } = await req.json();
    if (!studentId || !notifyMethod) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    await adminDb.collection("students").doc(studentId).update({ notifyMethod }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/push/subscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    await adminDb.collection("push_subscriptions").doc(studentId).delete();

    await adminDb.collection("students").doc(studentId).update({
      notifyMethod: "email",
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/push/subscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
