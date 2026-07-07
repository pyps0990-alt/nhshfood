import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import bcrypt from "bcryptjs";

const paySchema = z.object({
  studentId: z.string().min(1).max(20).trim(),
  password: z.string().min(1).max(100),
  amount: z.number().int().min(1).max(10000),
  orderRef: z.string().max(50).optional(),
});

export async function POST(req: NextRequest) {
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

  const parsed = paySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "參數錯誤", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { studentId, password, amount, orderRef } = parsed.data;

  try {
    // Verify student password
    const studentSnap = await adminDb.collection("students").doc(studentId).get();
    if (!studentSnap.exists) {
      return NextResponse.json({ error: "學生不存在" }, { status: 404 });
    }

    const student = studentSnap.data()!;
    if (!student.passwordHash) {
      return NextResponse.json({ error: "此學生尚未設定密碼" }, { status: 400 });
    }

    const passwordMatch = await bcrypt.compare(password, student.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
    }

    // Atomic deduction
    const result = await adminDb.runTransaction(async (tx) => {
      const walletRef = adminDb.collection("wallets").doc(studentId);
      const walletSnap = await tx.get(walletRef);

      if (!walletSnap.exists) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const wallet = walletSnap.data()!;
      if (wallet.balance < amount) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const newBalance = wallet.balance - amount;

      const txRef = adminDb.collection("wallet_transactions").doc();
      const txData = {
        studentId,
        amount: -amount,
        type: "payment" as const,
        method: "wallet",
        note: orderRef ? `訂單 ${orderRef}` : null,
        balanceAfter: newBalance,
        createdAt: new Date().toISOString(),
        createdBy: studentId,
      };

      tx.update(walletRef, {
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      });
      tx.set(txRef, txData);

      return { balance: newBalance };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "WALLET_NOT_FOUND") {
      return NextResponse.json({ error: "找不到錢包，請先開通錢包" }, { status: 404 });
    }
    if (msg === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "餘額不足" }, { status: 400 });
    }
    console.error("Pay error:", error);
    return NextResponse.json({ error: "付款失敗" }, { status: 500 });
  }
}
