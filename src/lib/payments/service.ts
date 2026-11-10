import { adminDb } from "@/lib/firebase-admin";
import { getEcpayConfig, newMerchantTradeNo } from "./ecpay";
import type { PaymentDoc } from "@/lib/orders";
import { OrderError } from "@/lib/orders";

export const TOP_UP_MIN = 50;
export const TOP_UP_MAX = 5000;
export const WALLET_CAP = 20000;
/** Unpaid top-up attempts older than this no longer reserve headroom. */
const PENDING_TOPUP_WINDOW_MS = 60 * 60 * 1000;

export function onlinePaymentEnabled(): boolean {
  return getEcpayConfig() !== null;
}

/** Create a payment attempt for an order awaiting payment. */
export async function createOrderPayment(orderId: string, studentId: string): Promise<string> {
  const cfg = getEcpayConfig();
  if (!cfg) throw new OrderError("PAYMENT_DISABLED", "線上付款尚未開放", 503);

  const orderRef = adminDb.collection("orders").doc(orderId);
  const merchantTradeNo = newMerchantTradeNo("O");

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new OrderError("NOT_FOUND", "訂單不存在", 404);
    const o = snap.data()!;
    if (o.studentId !== studentId) throw new OrderError("FORBIDDEN", "無權操作此訂單", 403);
    if (o.paymentMethod !== "ecpay") throw new OrderError("NOT_ONLINE", "此訂單不是線上付款", 400);
    if (o.status !== "awaiting_payment") throw new OrderError("NOT_AWAITING", "此訂單不需要付款", 409);

    const doc: PaymentDoc = {
      merchantTradeNo,
      purpose: "order",
      studentId,
      amount: o.totalPrice,
      orderId,
      status: "created",
      createdAt: new Date().toISOString(),
      mode: cfg.mode,
    };
    tx.create(adminDb.collection("payments").doc(merchantTradeNo), doc);
    tx.update(orderRef, { merchantTradeNo, paymentAttempts: (o.paymentAttempts || 0) + 1 });
  });
  return merchantTradeNo;
}

export async function createTopUpPayment(studentId: string, amount: number): Promise<string> {
  const cfg = getEcpayConfig();
  if (!cfg) throw new OrderError("PAYMENT_DISABLED", "線上付款尚未開放", 503);
  if (!Number.isInteger(amount) || amount < TOP_UP_MIN || amount > TOP_UP_MAX) {
    throw new OrderError("BAD_AMOUNT", `儲值金額需介於 $${TOP_UP_MIN} ~ $${TOP_UP_MAX}`);
  }
  const merchantTradeNo = newMerchantTradeNo("T");
  const walletRef = adminDb.collection("wallets").doc(studentId);
  const pendingQuery = adminDb
    .collection("payments")
    .where("studentId", "==", studentId)
    .where("status", "==", "created");
  const pendingWindowStart = Date.now() - PENDING_TOPUP_WINDOW_MS;

  // One transaction over the wallet AND the student's outstanding payment
  // attempts, so concurrent top-ups can't each see the same headroom.
  await adminDb.runTransaction(async (tx) => {
    const [wallet, pending] = await Promise.all([tx.get(walletRef), tx.get(pendingQuery)]);
    const balance = wallet.exists ? wallet.data()!.balance || 0 : 0;
    const outstanding = pending.docs
      .map((d) => d.data() as PaymentDoc)
      .filter((p) => p.purpose === "top_up" && Date.parse(p.createdAt) >= pendingWindowStart)
      .reduce((sum, p) => sum + p.amount, 0);
    if (balance + outstanding + amount > WALLET_CAP) {
      throw new OrderError(
        "BALANCE_CAP",
        outstanding > 0
          ? `錢包上限為 $${WALLET_CAP.toLocaleString()}，你還有 $${outstanding} 的儲值尚未完成付款`
          : `錢包餘額上限為 $${WALLET_CAP.toLocaleString()}`
      );
    }
    const doc: PaymentDoc = {
      merchantTradeNo,
      purpose: "top_up",
      studentId,
      amount,
      orderId: null,
      status: "created",
      createdAt: new Date().toISOString(),
      mode: cfg.mode,
    };
    tx.create(adminDb.collection("payments").doc(merchantTradeNo), doc);
  });
  return merchantTradeNo;
}
