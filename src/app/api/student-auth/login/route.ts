import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createStudentToken, studentCookieOptions, STUDENT_COOKIE_NAME } from "@/lib/auth";

const loginSchema = z.object({
  studentId: z.string().min(1).max(20).trim(),
  password: z.string().min(1).max(72),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`login:${ip}`, 10, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "登入嘗試過於頻繁，請 5 分鐘後再試" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "資料格式錯誤" }, { status: 400 });
    }

    const { studentId, password } = parsed.data;

    const perAccountRl = rateLimit(`login:acct:${studentId}`, 5, 5 * 60 * 1000);
    if (!perAccountRl.allowed) {
      return NextResponse.json({ error: "此帳號登入嘗試過於頻繁，請稍後再試" }, { status: 429 });
    }

    const doc = await adminDb.collection("students").doc(studentId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "學號或密碼錯誤" }, { status: 401 });
    }

    const data = doc.data()!;
    const valid = await bcrypt.compare(password, data.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "學號或密碼錯誤" }, { status: 401 });
    }

    const res = NextResponse.json({
      id: doc.id,
      studentId: data.studentId,
      className: data.className,
      studentName: data.studentName,
      displayName: data.displayName || "",
      email: data.email,
    });
    const token = await createStudentToken(data.studentId);
    res.cookies.set(STUDENT_COOKIE_NAME, token, studentCookieOptions());
    return res;
  } catch (err) {
    console.error("POST /api/student-auth/login error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
