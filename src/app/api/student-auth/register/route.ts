import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import bcrypt from "bcryptjs";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "密碼至少 8 個字元")
  .max(72, "密碼最多 72 個字元")
  .regex(/[A-Z]/, "密碼需包含至少一個大寫英文字母")
  .regex(/[a-z]/, "密碼需包含至少一個小寫英文字母")
  .regex(/[0-9]/, "密碼需包含至少一個數字")
  .regex(/[^A-Za-z0-9]/, "密碼需包含至少一個特殊符號");

const registerSchema = z.object({
  studentId: z.string().min(1).max(20).trim(),
  password: passwordSchema,
  className: z.string().min(1).max(10).trim(),
  studentName: z.string().min(1).max(50).trim(),
  email: z.string().email().max(100).trim(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "資料格式錯誤";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { studentId, password, className, studentName, email } = parsed.data;

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

    await adminDb.collection("students").doc(docId).set({
      studentId: sanitize(studentId),
      className: sanitize(className),
      studentName: sanitize(studentName),
      email: email.trim().toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      id: docId,
      studentId,
      className,
      studentName,
      email,
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/student-auth/register error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
