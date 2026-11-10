import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { durableRateLimit } from "@/lib/rate-limit";
import { requireStudent } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Direct wallet debit confirmed by the student's password (e.g. a counter
// purchase that isn't an online order). Requires BOTH the session cookie and
// the password; identity always comes from the session.
const paySchema = z.object({
  studentId: z.string().optional(), // ignored
  password: z.string().min(1).max(72),
  amount: z.number().int().min(1).max(5000),
  orderRef: z.string().max(50).optional(),
});

export async function POST(req: NextRequest) {
  const s = await requireStudent();
  if (s instanceof NextResponse) return s;

  const parsed = paySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "參數錯誤" }, { status: 400 });
  }
  const { password, amount, orderRef } = parsed.data;
  const studentId = s.studentId;

  const rl = await durableRateLimit(`wallet-pay:${studentId}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "嘗試次數過多，請 15 分鐘後再試" }, { status: 429 });
  }

  try {
    const studentSnap = await adminDb.collection("students").doc(studentId).get();
    const hash = studentSnap.exists ? studentSnap.data()!.passwordHash : null;
    if (!hash || !(await bcrypt.compare(password, hash))) {
      return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
    }

    const result = await adminDb.runTransaction(async (tx) => {
      const walletRef = adminDb.collection("wallets").doc(studentId);
      const walletSnap = await tx.get(walletRef);
      if (!walletSnap.exists) throw new Error("WALLET_NOT_FOUND");
      const wallet = walletSnap.data()!;
      if (wallet.closedAt) throw new Error("WALLET_CLOSED");
      if ((wallet.balance || 0) < amount) throw new Error("INSUFFICIENT_BALANCE");

      const newBalance = wallet.balance - amount;
      const nowIso = new Date().toISOString();
      tx.update(walletRef, { balance: newBalance, updatedAt: nowIso });
      tx.set(adminDb.collection("wallet_transactions").doc(), {
        studentId,
        amount: -amount,
        type: "payment",
        method: "wallet",
        note: orderRef ? `訂單 ${orderRef.replace(/[<>]/g, "")}` : null,
        balanceAfter: newBalance,
        createdAt: nowIso,
        createdBy: studentId,
      });
      return { balance: newBalance };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "WALLET_NOT_FOUND") return NextResponse.json({ error: "找不到錢包，請先開通錢包" }, { status: 404 });
    if (msg === "WALLET_CLOSED") return NextResponse.json({ error: "錢包已結清停用" }, { status: 403 });
    if (msg === "INSUFFICIENT_BALANCE") return NextResponse.json({ error: "餘額不足" }, { status: 400 });
    console.error("Pay error:", error);
    return NextResponse.json({ error: "付款失敗" }, { status: 500 });
  }
}
