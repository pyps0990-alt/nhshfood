import { NextRequest, NextResponse } from "next/server";
import { createToken } from "@/lib/auth";
import { db, collection, query, where, getDocs } from "@/lib/firebase";
import { createHash } from "crypto";

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "請輸入帳號密碼" }, { status: 400 });
  }

  const q = query(collection(db, "admins"), where("username", "==", username));
  const snap = await getDocs(q);

  if (snap.empty) {
    return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }

  const admin = snap.docs[0].data();
  if (admin.passwordHash !== hashPassword(password)) {
    return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }

  const token = await createToken(username);

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("admin_token");
  return res;
}
