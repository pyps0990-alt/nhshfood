import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireStudent } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendTestEmail } from "@/lib/mailer";

// Send a test email to the signed-in student (used by /settings).
export async function POST() {
  const s = await requireStudent();
  if (s instanceof NextResponse) return s;
  if (!rateLimit(`notify-test:${s.studentId}`, 3, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "請稍後再試" }, { status: 429 });
  }
  const doc = await adminDb.collection("students").doc(s.studentId).get();
  const email = doc.exists ? doc.data()!.email : null;
  if (!email) return NextResponse.json({ error: "帳號沒有 Email" }, { status: 400 });
  const r = await sendTestEmail(email);
  if (!r.sent) {
    return NextResponse.json(
      { error: r.reason === "mailer_not_configured" ? "系統尚未設定寄信服務" : "寄送失敗" },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true });
}
