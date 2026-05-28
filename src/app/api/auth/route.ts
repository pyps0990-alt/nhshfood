import { NextRequest, NextResponse } from "next/server";
import { createToken } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { createHash, timingSafeEqual } from "crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 5 login attempts per IP per 15 minutes
    const ip = getClientIp(req);
    const { allowed } = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "登入嘗試太頻繁，請 15 分鐘後再試" },
        { status: 429 }
      );
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "請輸入帳號密碼" }, { status: 400 });
    }

    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
    }

    if (username.length > 50 || password.length > 100) {
      return NextResponse.json({ error: "輸入過長" }, { status: 400 });
    }

    const snap = await adminDb
      .collection("admins")
      .where("username", "==", username)
      .get();

    if (snap.empty) {
      // Use same error message to prevent username enumeration
      return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }

    const admin = snap.docs[0].data();
    const inputHash = hashPassword(password);

    if (!safeCompare(inputHash, admin.passwordHash)) {
      return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }

    const token = await createToken(username);

    const res = NextResponse.json({ success: true });
    res.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("POST /api/auth error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return res;
}
