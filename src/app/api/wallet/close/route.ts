import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

// Close a student's wallet and generate a refund voucher.
//
// Flow:
//   1. Verify admin session (合作社 / cashier scope).
//   2. In one Firestore transaction:
//        a) Read wallet.
//        b) Generate a 6-digit refund code (unique per wallet_transactions).
//        c) Write a `refund` wallet_transactions row with the current balance
//           and code (so it can be audited later).
//        d) Zero out the wallet balance.
//   3. Return the code + amount so the admin can hand it to the student to
//      present at the 合作社 counter for cash payout.
//
// The refund transaction is the durable audit record — even if the physical
// cash handoff is delayed, the balance-was-X-at-time-Y is preserved.

const closeSchema = z.object({
  studentId: z.string().min(1).max(20).trim(),
  reason: z.string().max(200).optional(),
});

function generateRefundCode(): string {
  // Six digits, zero-padded. Uniqueness is enforced by including the
  // transaction ID alongside; this is a human-friendly counter for the
  // cashier, not a secret.
  return String(Math.floor(100000 + Math.random() * 900000));
}

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

  const parsed = closeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "參數錯誤", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { studentId, reason } = parsed.data;

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const walletRef = adminDb.collection("wallets").doc(studentId);
      const walletSnap = await tx.get(walletRef);

      if (!walletSnap.exists) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const wallet = walletSnap.data()!;
      const balance = wallet.balance || 0;

      if (balance === 0) {
        throw new Error("ALREADY_ZERO");
      }

      const refundCode = generateRefundCode();
      const nowIso = new Date().toISOString();

      const txRef = adminDb.collection("wallet_transactions").doc();
      const txData = {
        studentId,
        amount: -balance,
        type: "refund" as const,
        method: "cash_refund",
        note: reason ? `結清退費：${reason}` : "結清退費",
        refundCode,
        balanceAfter: 0,
        createdAt: nowIso,
        createdBy: session.username,
      };

      tx.set(txRef, txData);
      tx.update(walletRef, { balance: 0, closedAt: nowIso, updatedAt: nowIso });

      return {
        transactionId: txRef.id,
        refundCode,
        refundAmount: balance,
        studentId,
        createdAt: nowIso,
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "WALLET_NOT_FOUND") {
      return NextResponse.json({ error: "找不到此學生的錢包" }, { status: 404 });
    }
    if (msg === "ALREADY_ZERO") {
      return NextResponse.json({ error: "錢包餘額為零，無需退費" }, { status: 400 });
    }
    console.error("Wallet close error:", error);
    return NextResponse.json({ error: "結清失敗" }, { status: 500 });
  }
}
