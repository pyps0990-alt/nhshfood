import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET env var is not set!");
}
const SECRET = new TextEncoder().encode(JWT_SECRET || "MISSING-JWT-SECRET");

export async function createToken(username: string) {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { username: string };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ── Student session ───────────────────────────────────────────────
// Separate from admin. Students authenticate at login/register and get
// a signed httpOnly cookie carrying studentId. Server routes that act
// on behalf of a student must derive studentId from this cookie, not
// from the request body — otherwise F12-editing localStorage lets one
// student impersonate another for cash orders / wallet queries.

const STUDENT_COOKIE = "student_token";
const STUDENT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function createStudentToken(studentId: string) {
  return new SignJWT({ studentId, kind: "student" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyStudentToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.kind !== "student" || typeof payload.studentId !== "string") return null;
    return { studentId: payload.studentId as string };
  } catch {
    return null;
  }
}

export async function getStudentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  return verifyStudentToken(token);
}

export function studentCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: STUDENT_TTL_SECONDS,
  };
}

export const STUDENT_COOKIE_NAME = STUDENT_COOKIE;
