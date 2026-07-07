import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const querySchema = z.object({
  studentId: z.string().min(1).max(20).trim(),
});

async function generateUniqueWalletCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const existing = await adminDb
      .collection("wallets")
      .where("walletCode", "==", code)
      .limit(1)
      .get();
    if (existing.empty) return code;
  }
  throw new Error("Failed to generate unique wallet code");
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(ip, 30, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "請求太頻繁，請稍後再試" }, { status: 429 });
  }

  const studentId = req.nextUrl.searchParams.get("studentId");

  // Admin list mode: no studentId → return every wallet joined with student
  // profile. Used by the wallet management dashboard's filter view.
  if (!studentId) {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "請提供有效的學號" }, { status: 400 });
    }

    try {
      const [walletsSnap, studentsSnap] = await Promise.all([
        adminDb.collection("wallets").get(),
        adminDb.collection("students").get(),
      ]);

      const studentMap = new Map<string, { studentName?: string; displayName?: string; className?: string }>();
      studentsSnap.docs.forEach((d) => {
        const r = d.data();
        studentMap.set(d.id, {
          studentName: r.studentName || undefined,
          displayName: r.displayName || undefined,
          className: r.className || undefined,
        });
      });

      const wallets = walletsSnap.docs.map((d) => {
        const w = d.data();
        const s = studentMap.get(d.id) || {};
        return {
          studentId: d.id,
          balance: w.balance || 0,
          walletCode: w.walletCode || "",
          createdAt: w.createdAt || null,
          updatedAt: w.updatedAt || null,
          closedAt: w.closedAt || null,
          studentName: s.studentName || null,
          displayName: s.displayName || null,
          className: s.className || null,
        };
      });

      wallets.sort((a, b) => (b.balance || 0) - (a.balance || 0));

      return NextResponse.json({ wallets }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      console.error("Wallet list GET error:", err);
      return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
    }
  }

  const parsed = querySchema.safeParse({ studentId });
  if (!parsed.success) {
    return NextResponse.json({ error: "請提供有效的學號" }, { status: 400 });
  }

  try {
    // Verify student exists
    const studentSnap = await adminDb.collection("students").doc(parsed.data.studentId).get();
    if (!studentSnap.exists) {
      return NextResponse.json({ error: "找不到此學生" }, { status: 404 });
    }

    const walletRef = adminDb.collection("wallets").doc(parsed.data.studentId);
    let walletSnap = await walletRef.get();

    if (!walletSnap.exists) {
      const walletCode = await generateUniqueWalletCode();
      const walletData = {
        studentId: parsed.data.studentId,
        balance: 0,
        walletCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await walletRef.set(walletData);
      return NextResponse.json(walletData);
    }

    return NextResponse.json(walletSnap.data());
  } catch (error) {
    console.error("Wallet GET error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
