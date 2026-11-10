import { randomInt } from "crypto";
import { adminDb } from "./firebase-admin";

/** Strip angle brackets / control chars and trim. Output is still rendered via React (escaped). */
export function cleanText(s: string | null | undefined, max = 200): string | null {
  if (s == null) return null;
  // eslint-disable-next-line no-control-regex
  const out = String(s).replace(/[<>\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
  return out.length ? out : null;
}

/** CSV cell escaping incl. spreadsheet formula-injection defence. */
export function csvEscape(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function secureCode(len = 8): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

export function secureDigits(len = 6): string {
  let out = String(randomInt(1, 10));
  for (let i = 1; i < len; i++) out += String(randomInt(10));
  return out;
}

/** Only allow images we host or https URLs (no javascript:/data: etc). */
export function safeImageUrl(u: unknown): string | null {
  if (typeof u !== "string" || !u) return null;
  if (u.startsWith("/uploads/") && /^[\w/.-]+$/.test(u)) return u;
  try {
    const url = new URL(u);
    if (url.protocol === "https:") return url.toString().slice(0, 500);
  } catch {}
  return null;
}

/** Append an admin action to the audit log. Never throws. */
export async function auditLog(entry: {
  actor: string;
  action: string;
  target?: string | null;
  detail?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await adminDb.collection("admin_audit").add({
      ...entry,
      target: entry.target ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("auditLog failed:", err);
  }
}
