/**
 * In-memory rate limiter for serverless.
 * Includes per-key rate limiting and global concurrent request counting.
 */

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60000);

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
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
 * Global concurrent order request counter.
 * Rejects when too many orders are being processed simultaneously.
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
 * Get client IP from request headers
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
