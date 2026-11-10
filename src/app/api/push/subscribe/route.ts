import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireStudent } from "@/lib/auth";
import { z } from "zod";

// All push operations act on the signed-in student only — studentId in the
// body (sent by older clients) is ignored.

const subSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "endpoint must be https"),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
  }),
});

const methodSchema = z.object({ notifyMethod: z.enum(["email", "push", "none"]) });

export async function POST(req: NextRequest) {
  const s = await requireStudent();
  if (s instanceof NextResponse) return s;
  const parsed = subSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  try {
    await adminDb.collection("push_subscriptions").doc(s.studentId).set({
      subscription: parsed.data.subscription,
      updatedAt: new Date(),
    });
    await adminDb.collection("students").doc(s.studentId).update({ notifyMethod: "push" }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/push/subscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const s = await requireStudent();
  if (s instanceof NextResponse) return s;
  const parsed = methodSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid notifyMethod" }, { status: 400 });
  await adminDb.collection("students").doc(s.studentId).update({ notifyMethod: parsed.data.notifyMethod }).catch(() => {});
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const s = await requireStudent();
  if (s instanceof NextResponse) return s;
  try {
    await adminDb.collection("push_subscriptions").doc(s.studentId).delete();
    await adminDb.collection("students").doc(s.studentId).update({ notifyMethod: "email" }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/push/subscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
