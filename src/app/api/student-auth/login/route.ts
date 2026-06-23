import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  studentId: z.string().min(1).max(20).trim(),
  password: z.string().min(1).max(72),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "資料格式錯誤" }, { status: 400 });
    }

    const { studentId, password } = parsed.data;
    const doc = await adminDb.collection("students").doc(studentId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "學號或密碼錯誤" }, { status: 401 });
    }

    const data = doc.data()!;
    const valid = await bcrypt.compare(password, data.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "學號或密碼錯誤" }, { status: 401 });
    }

    return NextResponse.json({
      id: doc.id,
      studentId: data.studentId,
      className: data.className,
      studentName: data.studentName,
      email: data.email,
    });
  } catch (err) {
    console.error("POST /api/student-auth/login error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
