import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateSchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1, "姓名不能為空").max(20).optional(),
  email: z.string().email("Email 格式不正確").optional(),
  className: z.string().max(20).optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, "密碼至少 8 個字元")
    .regex(/[A-Z]/, "需要大寫字母")
    .regex(/[a-z]/, "需要小寫字母")
    .regex(/[0-9]/, "需要數字")
    .regex(/[^A-Za-z0-9]/, "需要特殊符號")
    .optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "資料格式錯誤" },
        { status: 400 }
      );
    }

    const { studentId, studentName, email, className, currentPassword, newPassword } = parsed.data;

    const docRef = adminDb.collection("students").doc(studentId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "帳號不存在" }, { status: 404 });
    }

    const data = doc.data()!;
    const update: Record<string, string> = {};

    if (studentName) update.studentName = studentName.replace(/[<>]/g, "").trim();
    if (email) update.email = email.trim();
    if (className !== undefined) update.className = className.replace(/[<>]/g, "").trim();

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "請輸入目前密碼" }, { status: 400 });
      }
      const valid = await bcrypt.compare(currentPassword, data.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "目前密碼不正確" }, { status: 401 });
      }
      update.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "沒有需要更新的資料" }, { status: 400 });
    }

    await docRef.update(update);

    return NextResponse.json({
      studentId,
      studentName: update.studentName || data.studentName,
      email: update.email || data.email,
      className: update.className ?? data.className,
    });
  } catch (err) {
    console.error("PATCH /api/student-auth/profile error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
