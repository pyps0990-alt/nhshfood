import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/auth";
import { invalidateRosterCache } from "@/lib/student-roster";
import { auditLog, cleanText } from "@/lib/security";
import { z } from "zod";

const studentSchema = z.object({
  className: z.string().min(1).max(20).trim(),
  studentId: z.string().min(1).max(20).trim().regex(/^[A-Za-z0-9_-]+$/, "學號格式錯誤"),
  studentName: z.string().min(1).max(50).trim(),
  email: z.string().email().max(100).trim(),
});

const bulkSchema = z.object({
  students: z.array(studentSchema).min(1).max(500),
});

// Fields that must never leave the server.
const SECRET_FIELDS = new Set(["passwordHash", "resetToken", "resetTokenExpires"]);

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const snap = await adminDb.collection("students").get();
    const students = snap.docs.map((d) => {
      const data = Object.fromEntries(
        Object.entries(d.data()).filter(([k]) => !SECRET_FIELDS.has(k))
      );
      return { id: d.id, ...data, hasPassword: !!d.data().passwordHash };
    });
    return NextResponse.json(students, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/students error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id || !/^[\w-]{1,60}$/.test(id)) {
      return NextResponse.json({ error: "缺少學生 id" }, { status: 400 });
    }

    // Refuse to delete a student who still has money in their wallet —
    // that balance would become unreachable.
    const wallet = await adminDb.collection("wallets").doc(id).get();
    if (wallet.exists && (wallet.data()!.balance || 0) > 0) {
      return NextResponse.json(
        { error: `此學生錢包仍有 $${wallet.data()!.balance} 餘額，請先結清退費` },
        { status: 409 }
      );
    }

    await adminDb.collection("students").doc(id).delete();
    invalidateRosterCache();
    await auditLog({ actor: auth.username, action: "student.delete", target: id });
    return NextResponse.json({ message: "已刪除" });
  } catch (err) {
    console.error("DELETE /api/students error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = bulkSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "資料格式錯誤" }, { status: 400 });
    }

    const batch = adminDb.batch();
    for (const s of parsed.data.students) {
      const docId = `${s.className}_${s.studentId}`;
      // merge: never wipe an existing passwordHash / notifyMethod on re-import
      batch.set(adminDb.collection("students").doc(docId), {
        className: cleanText(s.className, 20),
        studentId: s.studentId,
        studentName: cleanText(s.studentName, 50),
        email: s.email.toLowerCase(),
      }, { merge: true });
    }
    await batch.commit();
    invalidateRosterCache();
    await auditLog({ actor: auth.username, action: "student.bulk_import", detail: { count: parsed.data.students.length } });

    return NextResponse.json({
      message: `已匯入 ${parsed.data.students.length} 筆學生資料`,
      count: parsed.data.students.length,
    });
  } catch (err) {
    console.error("POST /api/students error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
