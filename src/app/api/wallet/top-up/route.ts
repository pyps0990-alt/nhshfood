import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const topUpSchema = z.object({
  studentId: z.string().min(1).max(20).trim(),
  amount: z.number().int().min(1).max(10000),
  method: z.enum(["cash", "bank_transfer", "admin_adjustment"]),
  note: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入管理員帳號" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const { allowed } = rateLimit(ip, 20, 60 * 1000);
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

  const { studentId, amount, method, note } = parsed.data;

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const walletRef = adminDb.collection("wallets").doc(studentId);
      const walletSnap = await tx.get(walletRef);

      if (!walletSnap.exists) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const wallet = walletSnap.data()!;
      const newBalance = wallet.balance + amount;
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

      return { transactionId: txRef.id, ...txData, balanceAfter: newBalance, reactivated: wasClosed };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "WALLET_NOT_FOUND") {
      return NextResponse.json({ error: "找不到此學生的錢包，請先查詢錢包" }, { status: 404 });
    }
    console.error("Top-up error:", error);
    return NextResponse.json({ error: "儲值失敗" }, { status: 500 });
  }
}
