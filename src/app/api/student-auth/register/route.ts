import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createStudentToken, studentCookieOptions, STUDENT_COOKIE_NAME } from "@/lib/auth";
import { durableRateLimit, getClientIp } from "@/lib/rate-limit";

const passwordSchema = z
  .string()
  .min(8, "密碼至少 8 個字元")
  .max(72, "密碼最多 72 個字元")
  .regex(/[A-Z]/, "密碼需包含至少一個大寫英文字母")
  .regex(/[a-z]/, "密碼需包含至少一個小寫英文字母")
  .regex(/[0-9]/, "密碼需包含至少一個數字")
  .regex(/[^A-Za-z0-9]/, "密碼需包含至少一個特殊符號");

const registerSchema = z.object({
  studentId: z.string().trim().min(1).max(20).regex(/^[A-Za-z0-9]+$/, "學號只能包含英文與數字"),
  password: passwordSchema,
  className: z.string().min(1).max(10).trim(),
  studentName: z.string().min(1).max(50).trim(),
  displayName: z.string().max(30).trim().optional(),
  email: z.string().email().max(100).trim(),
});

async function getAppConfig() {
  try {
    const snap = await adminDb.collection("settings").doc("app-config").get();
    return { requireSchoolEmail: true, requireLocation: true, ...snap.data() };
  } catch { return { requireSchoolEmail: true, requireLocation: true }; }
}

export async function POST(req: NextRequest) {
  try {
    // School Wi-Fi shares one public IP, so keep this generous.
    const rl = await durableRateLimit(`register:${getClientIp(req)}`, 60, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "註冊嘗試過於頻繁，請稍後再試" }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "資料格式錯誤";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { studentId, password, className, studentName, displayName, email } = parsed.data;

    const config = await getAppConfig();
    if (config.requireSchoolEmail && !email.toLowerCase().endsWith("@nhsh.tp.edu.tw")) {
      return NextResponse.json({ error: "僅限使用學校 Email（@nhsh.tp.edu.tw）" }, { status: 400 });
    }

    const docId = studentId;
    const existing = await adminDb.collection("students").doc(docId).get();
    if (existing.exists) {
      return NextResponse.json({ error: "此學號已註冊，請直接登入" }, { status: 409 });
    }

    const emailCheck = await adminDb
      .collection("students")
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();
    if (!emailCheck.empty) {
      return NextResponse.json({ error: "此 Email 已被使用" }, { status: 409 });
    }

    const sanitize = (s: string) => s.replace(/[<>]/g, "").trim();
    const passwordHash = await bcrypt.hash(password, 12);

    const doc: Record<string, string> = {
      studentId: sanitize(studentId),
      className: sanitize(className),
      studentName: sanitize(studentName),
      email: email.trim().toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    if (displayName) doc.displayName = sanitize(displayName);

    try {
      // create() fails atomically if the doc appeared since the check above.
      await adminDb.collection("students").doc(docId).create(doc);
    } catch {
      return NextResponse.json({ error: "此學號已註冊，請直接登入" }, { status: 409 });
    }

    const res = NextResponse.json({
      id: docId,
      studentId,
      className,
      studentName,
      displayName: displayName || "",
      email,
    }, { status: 201 });
    const token = await createStudentToken(studentId);
    res.cookies.set(STUDENT_COOKIE_NAME, token, studentCookieOptions());
    return res;
  } catch (err) {
    console.error("POST /api/student-auth/register error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
