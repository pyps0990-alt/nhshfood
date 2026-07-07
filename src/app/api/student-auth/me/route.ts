import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getStudentSession } from "@/lib/auth";

// Returns the currently-authenticated student's profile, derived from
// the session cookie. Used by clients to hydrate their UI with the
// authoritative identity — never trust the localStorage copy alone for
// security-relevant checks.

export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  try {
    const doc = await adminDb.collection("students").doc(session.studentId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "帳號不存在" }, { status: 404 });
    }
    const d = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      studentId: d.studentId,
      className: d.className,
      studentName: d.studentName,
      displayName: d.displayName || "",
      email: d.email,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/student-auth/me error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
