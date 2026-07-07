/**
 * Server-side in-memory cache with configurable TTL.
 * Reduces Firestore reads for frequently accessed endpoints.
 */

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
}

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export function getMenuCache(key: string): unknown[] | null {
  const entry = cache.get(`menu:${key}`);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(`menu:${key}`);
    return null;
  }
  return entry.data as unknown[];
}

export function setMenuCache(key: string, data: unknown[]): void {
  cache.set(`menu:${key}`, { data, timestamp: Date.now() });
}

export function invalidateMenuCache(): void {
  for (const key of cache.keys()) {
    if (key.startsWith("menu:")) cache.delete(key);
  }
}

// Generic cache for any API data
export function getCached<T>(key: string, ttlMs: number = TTL_MS): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}
