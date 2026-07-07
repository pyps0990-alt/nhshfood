import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const updateSchema = z.object({
  studentId: z.string().min(1),
  password: z.string().optional(),
  studentName: z.string().min(1, "姓名不能為空").max(20).optional(),
  displayName: z.string().max(30).optional(),
  email: z.string().email("Email 格式不正確").optional(),
  className: z.string().max(20).optional(),
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
    const ip = getClientIp(req);
    const rl = rateLimit(`profile:${ip}`, 10, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "操作過於頻繁，請稍後再試" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "資料格式錯誤" },
        { status: 400 }
      );
    }

    const { studentId, password, studentName, displayName, email, className, newPassword } = parsed.data;

    const docRef = adminDb.collection("students").doc(studentId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "帳號不存在" }, { status: 404 });
    }

    const data = doc.data()!;

    // Only verify password when changing password
    if (newPassword) {
      if (!password) {
        return NextResponse.json({ error: "請輸入目前密碼以驗證身分" }, { status: 400 });
      }
      const valid = await bcrypt.compare(password, data.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "密碼驗證失敗" }, { status: 401 });
      }
    }

    const update: Record<string, string> = {};

    if (studentName) update.studentName = studentName.replace(/[<>]/g, "").trim();
    if (displayName !== undefined) update.displayName = displayName.replace(/[<>]/g, "").trim();
    if (email) update.email = email.trim().toLowerCase();
    if (className !== undefined) update.className = className.replace(/[<>]/g, "").trim();

    if (newPassword) {
      update.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "沒有需要更新的資料" }, { status: 400 });
    }

    await docRef.update(update);

    return NextResponse.json({
      studentId,
      studentName: update.studentName || data.studentName,
      displayName: update.displayName ?? data.displayName ?? "",
      email: update.email || data.email,
      className: update.className ?? data.className,
    });
  } catch (err) {
    console.error("PATCH /api/student-auth/profile error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
