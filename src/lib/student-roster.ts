import { adminDb } from "./firebase-admin";

/**
 * Student roster stored in Firestore `students` collection.
 *
 * Each doc: {
 *   className: "206",
 *   studentId: "20",
 *   studentName: "王小明",
 *   email: "student@school.edu.tw"
 * }
 *
 * Admin can bulk-upload via /api/students (future feature).
 * For now, lookup by className + studentId.
 */

interface StudentRecord {
  className: string;
  studentId: string;
  studentName: string;
  email: string;
}

// In-memory cache (refreshed every 5 minutes)
let cache: StudentRecord[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadRoster(): Promise<StudentRecord[]> {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache;

  try {
    const snap = await adminDb.collection("students").get();
    cache = snap.docs.map((d) => d.data() as StudentRecord);
    cacheTime = Date.now();
    return cache;
  } catch (err) {
    console.error("Failed to load student roster:", err);
    return cache || [];
  }
}

export async function findStudentEmail(
  className: string | null,
  studentId: string
): Promise<string | null> {
  if (!className && !studentId) return null;

  const roster = await loadRoster();

  // Match by className + studentId
  const match = roster.find(
    (s) =>
      s.studentId === studentId &&
      (!className || s.className === className)
  );

  return match?.email || null;
}

export async function getStudentRecord(
  className: string | null,
  studentId: string
): Promise<StudentRecord | null> {
  const roster = await loadRoster();
  return (
    roster.find(
      (s) =>
        s.studentId === studentId &&
        (!className || s.className === className)
    ) || null
  );
}

export function invalidateRosterCache() {
  cache = null;
  cacheTime = 0;
}
