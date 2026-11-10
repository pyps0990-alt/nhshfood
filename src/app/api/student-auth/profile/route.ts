import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit, durableRateLimit, getClientIp } from "@/lib/rate-limit";
import { requireStudent } from "@/lib/auth";
import { cleanText } from "@/lib/security";

const passwordRule = z
  .string()
  .min(8, "密碼至少 8 個字元")
  .max(72, "密碼最多 72 個字元")
  .regex(/[A-Z]/, "需要大寫字母")
  .regex(/[a-z]/, "需要小寫字母")
  .regex(/[0-9]/, "需要數字")
  .regex(/[^A-Za-z0-9]/, "需要特殊符號");

const updateSchema = z.object({
  // studentId from older clients is accepted but ignored — identity comes from the session.
  studentId: z.string().optional(),
  password: z.string().max(72).optional(),
  studentName: z.string().trim().min(1, "姓名不能為空").max(20).optional(),
  displayName: z.string().trim().max(30).optional(),
  email: z.string().trim().email("Email 格式不正確").max(100).optional(),
  className: z.string().trim().max(20).optional(),
  newPassword: passwordRule.optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const s = await requireStudent();
    if (s instanceof NextResponse) return s;

    const ip = getClientIp(req);
    if (!rateLimit(`profile:${s.studentId}:${ip}`, 10, 5 * 60 * 1000).allowed) {
      return NextResponse.json({ error: "操作過於頻繁，請稍後再試" }, { status: 429 });
    }

    const parsed = updateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "資料格式錯誤" }, { status: 400 });
    }
    const { password, studentName, displayName, email, className, newPassword } = parsed.data;

    const docRef = adminDb.collection("students").doc(s.studentId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "帳號不存在" }, { status: 404 });
    }
    const data = doc.data()!;

    const emailChanging = !!email && email.toLowerCase() !== (data.email || "").toLowerCase();

    // Sensitive changes (password, email) require the current password.
    if (newPassword || emailChanging) {
      if (!password) {
        return NextResponse.json({ error: "請輸入目前密碼以驗證身分" }, { status: 400 });
      }
      const rl = await durableRateLimit(`reauth:${s.studentId}`, 5, 15 * 60 * 1000);
      if (!rl.allowed) {
        return NextResponse.json({ error: "密碼錯誤次數過多，請 15 分鐘後再試" }, { status: 429 });
      }
      if (!data.passwordHash || !(await bcrypt.compare(password, data.passwordHash))) {
        return NextResponse.json({ error: "密碼驗證失敗" }, { status: 401 });
      }
    }

    const update: Record<string, string> = {};
    if (studentName) update.studentName = cleanText(studentName, 20)!;
    if (displayName !== undefined) update.displayName = cleanText(displayName, 30) || "";
    if (className !== undefined) update.className = cleanText(className, 20) || "";

    if (emailChanging) {
      const normalized = email!.toLowerCase();
      const cfg = await adminDb.collection("settings").doc("app-config").get();
      const requireSchoolEmail = cfg.exists ? cfg.data()?.requireSchoolEmail !== false : true;
      if (requireSchoolEmail && !normalized.endsWith("@nhsh.tp.edu.tw")) {
        return NextResponse.json({ error: "僅限使用學校 Email（@nhsh.tp.edu.tw）" }, { status: 400 });
      }
      const dup = await adminDb.collection("students").where("email", "==", normalized).limit(1).get();
      if (!dup.empty && dup.docs[0].id !== s.studentId) {
        return NextResponse.json({ error: "此 Email 已被使用" }, { status: 409 });
      }
      update.email = normalized;
    }

    if (newPassword) {
      update.passwordHash = await bcrypt.hash(newPassword, 12);
      update.passwordChangedAt = new Date().toISOString();
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "沒有需要更新的資料" }, { status: 400 });
    }

    await docRef.update(update);

    return NextResponse.json({
      studentId: s.studentId,
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
