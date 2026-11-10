import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const topUpSchema = z.object({
  studentId: z.string().min(1).max(20).trim(),
  amount: z.number().int().min(1).max(10000),
  method: z.enum(["cash", "bank_transfer", "admin_adjustment"]),
  note: z.string().max(200).optional(),
  // Client-generated key so a double-click / retry can't top up twice.
  idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{8,64}$/).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const ip = getClientIp(req);
  const { allowed } = rateLimit(`top-up:${session.username}:${ip}`, 20, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "請求太頻繁，請稍後再試" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "無效的請求格式" }, { status: 400 });
  }

  const parsed = topUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "參數錯誤", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { studentId, amount, method, note, idempotencyKey } = parsed.data;

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const walletRef = adminDb.collection("wallets").doc(studentId);
      const idemRef = idempotencyKey ? adminDb.collection("topup_idempotency").doc(idempotencyKey) : null;
      const idemSnap = idemRef ? await tx.get(idemRef) : null;
      if (idemSnap?.exists) {
        return { ...(idemSnap.data()!.result as Record<string, unknown>), replayed: true };
      }
      const walletSnap = await tx.get(walletRef);

      if (!walletSnap.exists) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const wallet = walletSnap.data()!;
      const newBalance = (wallet.balance || 0) + amount;
      if (newBalance > 20000) {
        throw new Error("BALANCE_CAP");
      }
      const wasClosed = !!wallet.closedAt;

      const txRef = adminDb.collection("wallet_transactions").doc();
      const noteWithReactivate = wasClosed
        ? `${note || ""}${note ? "／" : ""}系統自動重新啟用（結清後儲值）`
        : note || null;
      const txData = {
        studentId,
        amount,
        type: "top_up" as const,
        method,
        note: noteWithReactivate,
        balanceAfter: newBalance,
        createdAt: new Date().toISOString(),
        createdBy: session.username,
      };

      const walletUpdate: Record<string, unknown> = {
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      };
      // Auto-reactivate: topping up a closed wallet reopens it. Keeps the
      // audit trail consistent — no orphan "closed wallet with positive
      // balance" state can exist.
      if (wasClosed) {
        walletUpdate.closedAt = null;
        walletUpdate.reactivatedAt = new Date().toISOString();
      }
      tx.update(walletRef, walletUpdate);
      tx.set(txRef, txData);

      const out = { transactionId: txRef.id, ...txData, balanceAfter: newBalance, reactivated: wasClosed };
      if (idemRef) tx.set(idemRef, { result: out, createdAt: new Date().toISOString(), expireAt: new Date(Date.now() + 86400000) });
      return out;
    });

    await auditLog({ actor: session.username, action: "wallet.top_up", target: studentId, detail: result as unknown as Record<string, unknown>, ip });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "WALLET_NOT_FOUND") {
      return NextResponse.json({ error: "找不到此學生的錢包，請先查詢錢包" }, { status: 404 });
    }
    if (msg === "BALANCE_CAP") {
      return NextResponse.json({ error: "錢包餘額上限為 $20,000" }, { status: 400 });
    }
    console.error("Top-up error:", error);
    return NextResponse.json({ error: "儲值失敗" }, { status: 500 });
  }
}
