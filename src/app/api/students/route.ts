import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { invalidateRosterCache } from "@/lib/student-roster";
import { z } from "zod";

const studentSchema = z.object({
  className: z.string().min(1).max(20).trim(),
  studentId: z.string().min(1).max(20).trim(),
  studentName: z.string().min(1).max(50).trim(),
  email: z.string().email().max(100).trim(),
});

const bulkSchema = z.object({
  students: z.array(studentSchema).min(1).max(500),
});

// GET: list all students (admin only)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const snap = await adminDb.collection("students").get();
    const students = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json(students);
  } catch (err) {
    console.error("GET /api/students error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// POST: bulk upload students (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const batch = adminDb.batch();
    for (const s of parsed.data.students) {
      // Use className_studentId as doc ID to prevent duplicates
      const docId = `${s.className}_${s.studentId}`;
      batch.set(adminDb.collection("students").doc(docId), {
        className: s.className,
        studentId: s.studentId,
        studentName: s.studentName,
        email: s.email,
      });
    }

    await batch.commit();
    invalidateRosterCache();

    return NextResponse.json({
      message: `已匯入 ${parsed.data.students.length} 筆學生資料`,
      count: parsed.data.students.length,
    });
  } catch (err) {
    console.error("POST /api/students error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
