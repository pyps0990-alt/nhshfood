import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  STUDENT_COOKIE_NAME,
  verifyToken,
  verifyStudentToken,
  type AdminSession,
} from "./tokens";

export * from "./tokens";

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Use at the top of every admin-only route handler:
 *
 *   const auth = await requireAdmin();
 *   if (auth instanceof NextResponse) return auth;
 */
export async function requireAdmin(): Promise<AdminSession | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入管理員帳號" }, { status: 401 });
  }
  return session;
}

export async function getStudentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyStudentToken(token);
}

export async function requireStudent(): Promise<{ studentId: string } | NextResponse> {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  return session;
}
