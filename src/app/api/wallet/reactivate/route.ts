import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

// Reopen a previously-closed wallet.
//
// Use case: student who was marked as graduated re-enrolls, or the closure
// was performed in error. Balance is left at zero (the refund was already
// paid out via the refund voucher); admin can then top up separately.
//
// The reactivation itself is recorded as a wallet_transactions row with
// type=admin_note, amount=0, so the audit trail shows exactly who opened
// the wallet again and when.

const schema = z.object({
  studentId: z.string().min(1).max(20).trim(),
  note: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入管理員帳號" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const { allowed } = rateLimit(ip, 10, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "請求太頻繁，請稍後再試" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "無效的請求格式" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "參數錯誤", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { studentId, note } = parsed.data;

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const walletRef = adminDb.collection("wallets").doc(studentId);
      const walletSnap = await tx.get(walletRef);
      if (!walletSnap.exists) {
        throw new Error("WALLET_NOT_FOUND");
      }
      const wallet = walletSnap.data()!;
      if (!wallet.closedAt) {
        throw new Error("NOT_CLOSED");
      }
      const nowIso = new Date().toISOString();
      const txRef = adminDb.collection("wallet_transactions").doc();
      tx.set(txRef, {
        studentId,
        amount: 0,
        type: "admin_note",
        method: "reactivate",
        note: note ? `重新啟用：${note}` : "重新啟用",
        balanceAfter: wallet.balance || 0,
        createdAt: nowIso,
        createdBy: session.username,
      });
      tx.update(walletRef, {
        closedAt: null,
        reactivatedAt: nowIso,
        updatedAt: nowIso,
      });
      return { transactionId: txRef.id, studentId, reactivatedAt: nowIso };
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "WALLET_NOT_FOUND") {
      return NextResponse.json({ error: "找不到此學生的錢包" }, { status: 404 });
    }
    if (msg === "NOT_CLOSED") {
      return NextResponse.json({ error: "錢包並未結清，無需重新啟用" }, { status: 400 });
    }
    console.error("Wallet reactivate error:", err);
    return NextResponse.json({ error: "重新啟用失敗" }, { status: 500 });
  }
}
