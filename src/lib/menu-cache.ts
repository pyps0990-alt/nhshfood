/**
 * Server-side in-memory menu cache with 30-second TTL.
 * Reduces Firestore reads for the menu GET endpoint.
 */

interface CacheEntry {
  data: unknown[];
  timestamp: number;
}

const TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

export function getMenuCache(key: string): unknown[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setMenuCache(key: string, data: unknown[]): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateMenuCache(): void {
  cache.clear();
}
