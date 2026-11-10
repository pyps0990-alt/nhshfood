// All business dates (order numbers, "today's orders", analytics ranges,
// daily reconciliation) are in Taiwan time. Vercel functions run in UTC, so
// never use Date#getDate()/setHours() for business logic — use these.

export const TZ = "Asia/Taipei";
const OFFSET_MS = 8 * 60 * 60 * 1000; // Taiwan has no DST

/** "YYYYMMDD" in Taipei time */
export function taipeiDateKey(d: Date = new Date()): string {
  const t = new Date(d.getTime() + OFFSET_MS);
  return `${t.getUTCFullYear()}${String(t.getUTCMonth() + 1).padStart(2, "0")}${String(t.getUTCDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" in Taipei time */
export function taipeiIsoDate(d: Date = new Date()): string {
  const k = taipeiDateKey(d);
  return `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
}

/** Start of the Taipei calendar day containing `d`, as an absolute Date. */
export function taipeiStartOfDay(d: Date = new Date()): Date {
  const t = new Date(d.getTime() + OFFSET_MS);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - OFFSET_MS);
}

/** Start of the Taipei day `days` days before today. */
export function taipeiDaysAgo(days: number, now: Date = new Date()): Date {
  return new Date(taipeiStartOfDay(now).getTime() - days * 86400000);
}

/** Bounds of a "YYYY-MM-DD" Taipei calendar day. */
export function taipeiDayBounds(dateStr: string): { start: Date; end: Date } | null {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const startUtc = Date.UTC(+m[1], +m[2] - 1, +m[3]) - OFFSET_MS;
  if (isNaN(startUtc)) return null;
  return { start: new Date(startUtc), end: new Date(startUtc + 86400000 - 1) };
}

/** Hour (0-23) in Taipei */
export function taipeiHour(d: Date): number {
  return new Date(d.getTime() + OFFSET_MS).getUTCHours();
}

/** Weekday (0=Sun) in Taipei */
export function taipeiWeekday(d: Date): number {
  return new Date(d.getTime() + OFFSET_MS).getUTCDay();
}

/** "yyyy/MM/dd HH:mm:ss" in Taipei — the format ECPay requires. */
export function taipeiEcpayDate(d: Date = new Date()): string {
  const t = new Date(d.getTime() + OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}/${p(t.getUTCMonth() + 1)}/${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}`;
}
