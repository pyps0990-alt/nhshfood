import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";

// ── Key management ────────────────────────────────────────────────
// Admin and student sessions are signed with DIFFERENT keys derived from
// JWT_SECRET, and each token carries an audience. A student token can never
// verify as an admin token (and vice versa) even if someone copies one
// cookie value into the other cookie.

const IS_PROD = process.env.NODE_ENV === "production";
const ISSUER = "nhsh-food";

let warnedShort = false;
function rawSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s) {
    if (s.length < 32 && !warnedShort) {
      warnedShort = true;
      console.warn("JWT_SECRET is shorter than 32 characters — please rotate to a longer random value");
    }
    return s;
  }
  if (IS_PROD && process.env.NEXT_PHASE !== "phase-production-build") {
    // Fail closed: never sign or accept tokens with a guessable key. Preview
    // deployments share the production Firestore, so this applies there too.
    throw new Error("JWT_SECRET must be set in production");
  }
  return "dev-only-insecure-secret-do-not-use-in-production";
}

function derive(purpose: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(`${purpose}:${rawSecret()}`).digest());
}

export const ADMIN_COOKIE_NAME = "admin_token";
export const STUDENT_COOKIE_NAME = "student_token";
const ADMIN_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const STUDENT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface AdminSession {
  username: string;
  role: "admin";
}

// ── Admin ─────────────────────────────────────────────────────────

export async function createToken(username: string) {
  return new SignJWT({ username, kind: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience("admin")
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_TTL_SECONDS}s`)
    .sign(derive("admin"));
}

export async function verifyToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, derive("admin"), {
      issuer: ISSUER,
      audience: "admin",
      algorithms: ["HS256"],
    });
    if (payload.kind !== "admin" || typeof payload.username !== "string") return null;
    return { username: payload.username, role: "admin" };
  } catch {
    return null;
  }
}



export function adminCookieOptions(maxAge = ADMIN_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

// ── Student ───────────────────────────────────────────────────────
// Server routes that act on behalf of a student must derive studentId from
// this cookie, never from the request body.

export async function createStudentToken(studentId: string) {
  return new SignJWT({ studentId, kind: "student" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience("student")
    .setIssuedAt()
    .setExpirationTime(`${STUDENT_TTL_SECONDS}s`)
    .sign(derive("student"));
}

export async function verifyStudentToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, derive("student"), {
      issuer: ISSUER,
      audience: "student",
      algorithms: ["HS256"],
    });
    if (payload.kind !== "student" || typeof payload.studentId !== "string") return null;
    return { studentId: payload.studentId as string };
  } catch {
    return null;
  }
}



export function studentCookieOptions(maxAge = STUDENT_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
