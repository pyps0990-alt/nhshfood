/**
 * Rate limiting.
 *
 * - `rateLimit()` is an in-memory, per-instance limiter. Cheap, good for
 *   smoothing bursts, but each serverless instance has its own counter, so it
 *   is NOT a security control on its own.
 * - `durableRateLimit()` stores counters in Firestore and is shared across all
 *   instances. Use it for anything an attacker would brute-force: logins,
 *   password-confirmed payments, registration.
 */

import { createHash } from "crypto";

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  sweep(now);
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { allowed: entry.count <= maxRequests, remaining };
}

/**
 * Firestore-backed fixed-window limiter. Fails OPEN on Firestore errors for
 * availability (the in-memory limiter still applies), but logs loudly.
 */
export async function durableRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const { adminDb } = await import("./firebase-admin");
  const id = createHash("sha256").update(key).digest("hex").slice(0, 40);
  const ref = adminDb.collection("rate_limits").doc(id);
  const now = Date.now();
  try {
    return await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists ? (snap.data() as { count: number; resetAt: number }) : null;
      if (!d || now > d.resetAt) {
        tx.set(ref, { count: 1, resetAt: now + windowMs, expireAt: new Date(now + windowMs) });
        return { allowed: true, retryAfterSec: 0 };
      }
      if (d.count >= maxRequests) {
        return { allowed: false, retryAfterSec: Math.ceil((d.resetAt - now) / 1000) };
      }
      tx.update(ref, { count: d.count + 1 });
      return { allowed: true, retryAfterSec: 0 };
    });
  } catch (err) {
    console.error("durableRateLimit error (failing open):", err);
    return { allowed: true, retryAfterSec: 0 };
  }
}

/** Clear a durable counter, e.g. after a successful login. */
export async function resetDurableRateLimit(key: string): Promise<void> {
  const { adminDb } = await import("./firebase-admin");
  const id = createHash("sha256").update(key).digest("hex").slice(0, 40);
  await adminDb.collection("rate_limits").doc(id).delete().catch(() => {});
}

/**
 * Global concurrent order request counter (per instance).
 */
let concurrentOrderRequests = 0;
const MAX_CONCURRENT_ORDERS = 100;

export function acquireConcurrentSlot(): boolean {
  if (concurrentOrderRequests >= MAX_CONCURRENT_ORDERS) return false;
  concurrentOrderRequests++;
  return true;
}

export function releaseConcurrentSlot(): void {
  concurrentOrderRequests = Math.max(0, concurrentOrderRequests - 1);
}

/**
 * Client IP. On Vercel, `x-real-ip` is set by the platform and cannot be
 * spoofed by the client; the left-most `x-forwarded-for` entry can.
 */
export function getClientIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    // Right-most entry is the one added by the closest trusted proxy.
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}
