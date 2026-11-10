/**
 * Order domain logic. Every state change that touches money or stock runs in
 * a single Firestore transaction, so it is atomic and safe to retry.
 *
 * Status machine
 * ──────────────
 *   awaiting_payment ──paid──▶ pending ─▶ confirmed ─▶ ready ─▶ picked_up
 *          │                      │            │          │        │
 *          └─timeout/fail─▶ payment_failed     └──────────┴─▶ cancelled
 *
 *   picked_up → ready is allowed (undo a mis-tap at the counter).
 *   cancelled and payment_failed are terminal — this is what makes refunds
 *   impossible to apply twice.
 */

import { FieldValue, type Transaction, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { taipeiDateKey } from "./time";
import { cleanText } from "./security";

export type OrderStatus =
  | "awaiting_payment"
  | "payment_failed"
  | "pending"
  | "confirmed"
  | "ready"
  | "picked_up"
  | "cancelled";

export type PaymentMethod = "cash" | "wallet" | "ecpay";

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["payment_failed", "cancelled"], // → pending only via markOrderPaid
  payment_failed: [],
  pending: ["confirmed", "ready", "cancelled"],
  confirmed: ["pending", "ready", "cancelled"],
  ready: ["confirmed", "picked_up", "cancelled"],
  picked_up: ["ready"],
  cancelled: [],
};

/** Admin-settable statuses (payment states are system-only). */
export const ADMIN_STATUSES: OrderStatus[] = ["pending", "confirmed", "ready", "picked_up", "cancelled"];

export const PAYMENT_TIMEOUT_MS = 20 * 60 * 1000;

export class OrderError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

export interface OrderItemInput {
  menuItemId: string;
  quantity: number;
}

export interface CreateOrderInput {
  studentId: string;
  studentName: string | null;
  className: string | null;
  department: "breakfast" | "lunch";
  note: string | null;
  paymentMethod: PaymentMethod;
  pickupDate: string | null;
  pickupTime: string | null;
  items: OrderItemInput[];
  source: "student" | "pos";
  createdBy: string;
  idempotencyKey?: string | null;
  /** Set when paymentMethod === "ecpay" */
  merchantTradeNo?: string | null;
}

export interface CreatedOrder {
  id: string;
  orderNumber: string;
  totalPrice: number;
  status: OrderStatus;
  items: { menuItemId: string; name: string; quantity: number; price: number }[];
  merchantTradeNo: string | null;
  replayed: boolean;
}

function mergeItems(items: OrderItemInput[]): OrderItemInput[] {
  const m = new Map<string, number>();
  for (const i of items) m.set(i.menuItemId, (m.get(i.menuItemId) || 0) + i.quantity);
  return [...m.entries()].map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const items = mergeItems(input.items);
  const menuRefs = items.map((i) => adminDb.collection("menuItems").doc(i.menuItemId));
  const counterRef = adminDb.collection("counters").doc("orderNumber");
  const walletRef = input.paymentMethod === "wallet" ? adminDb.collection("wallets").doc(input.studentId) : null;
  const idemRef = input.idempotencyKey
    ? adminDb.collection("order_idempotency").doc(`${input.studentId}_${input.idempotencyKey}`)
    : null;
  const todayKey = taipeiDateKey();

  return adminDb.runTransaction(async (tx) => {
    // ── READS ──
    if (idemRef) {
      const idem = await tx.get(idemRef);
      if (idem.exists) {
        const prev = idem.data()!;
        const prevOrder = await tx.get(adminDb.collection("orders").doc(prev.orderId));
        if (prevOrder.exists) {
          const o = prevOrder.data()!;
          return {
            id: prevOrder.id,
            orderNumber: o.orderNumber,
            totalPrice: o.totalPrice,
            status: o.status,
            items: o.items,
            merchantTradeNo: o.merchantTradeNo || null,
            replayed: true,
          };
        }
      }
    }
    const menuDocs = await Promise.all(menuRefs.map((r) => tx.get(r)));
    const counterDoc = await tx.get(counterRef);
    const walletSnap = walletRef ? await tx.get(walletRef) : null;

    // ── VALIDATE ──
    const verified: CreatedOrder["items"] = [];
    let total = 0;
    menuDocs.forEach((d, i) => {
      if (!d.exists) throw new OrderError("ITEM_NOT_FOUND", "部分品項已不存在，請重新整理菜單");
      const m = d.data()!;
      if (m.department !== input.department) throw new OrderError("WRONG_DEPT", `${m.name} 不屬於此部門`);
      if (!m.available || m.soldOut) throw new OrderError("SOLD_OUT", `已售罄: ${m.name}`);
      if (m.stock != null && m.stock < items[i].quantity) {
        throw new OrderError("NO_STOCK", `庫存不足: ${m.name}（剩餘 ${m.stock} 份）`);
      }
      verified.push({ menuItemId: d.id, name: m.name, quantity: items[i].quantity, price: m.price });
      total += m.price * items[i].quantity;
    });
    if (total <= 0 && input.paymentMethod === "ecpay") {
      throw new OrderError("ZERO_TOTAL", "金額為 0 的訂單無法線上付款");
    }

    let newBalance: number | null = null;
    if (walletRef) {
      if (!walletSnap?.exists) throw new OrderError("WALLET_NOT_FOUND", "找不到錢包，請先開通錢包", 404);
      const w = walletSnap.data()!;
      if (w.closedAt) throw new OrderError("WALLET_CLOSED", "錢包已結清停用，請洽合作社", 403);
      if ((w.balance || 0) < total) throw new OrderError("INSUFFICIENT_BALANCE", "錢包餘額不足");
      newBalance = (w.balance || 0) - total;
    }

    // ── WRITES ──
    const nowIso = new Date().toISOString();
    const orderRef = adminDb.collection("orders").doc();

    // Reserve stock now (also for ecpay; released if payment fails/expires).
    menuDocs.forEach((d, i) => {
      const m = d.data()!;
      if (m.stock != null) {
        const s = m.stock - items[i].quantity;
        tx.update(menuRefs[i], s <= 0 ? { stock: s, soldOut: true, available: false } : { stock: s });
      }
    });

    if (walletRef && newBalance !== null) {
      tx.update(walletRef, { balance: newBalance, updatedAt: nowIso });
      tx.set(adminDb.collection("wallet_transactions").doc(), {
        studentId: input.studentId,
        amount: -total,
        type: "payment",
        method: "wallet",
        orderId: orderRef.id,
        note: null,
        balanceAfter: newBalance,
        createdAt: nowIso,
        createdBy: input.createdBy,
      });
    }

    const prev = counterDoc.exists ? counterDoc.data()! : null;
    const seq = prev && prev.date === todayKey ? (prev.seq || 0) + 1 : 1;
    tx.set(counterRef, { date: todayKey, seq });
    const orderNumber = `${todayKey}${String(seq).padStart(4, "0")}`;

    const status: OrderStatus = input.paymentMethod === "ecpay" ? "awaiting_payment" : "pending";

    tx.set(orderRef, {
      studentId: input.studentId,
      studentName: cleanText(input.studentName, 50),
      className: cleanText(input.className, 30),
      department: input.department,
      note: cleanText(input.note, 200),
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === "cash" ? "unpaid" : input.paymentMethod === "wallet" ? "paid" : "unpaid",
      merchantTradeNo: input.merchantTradeNo || null,
      pickupDate: cleanText(input.pickupDate, 20),
      pickupTime: cleanText(input.pickupTime, 20),
      totalPrice: total,
      status,
      orderNumber,
      items: verified,
      source: input.source,
      refunded: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (idemRef) {
      tx.set(idemRef, { orderId: orderRef.id, createdAt: nowIso, expireAt: new Date(Date.now() + 86400000) });
    }

    return {
      id: orderRef.id,
      orderNumber,
      totalPrice: total,
      status,
      items: verified,
      merchantTradeNo: input.merchantTradeNo || null,
      replayed: false,
    };
  });
}

// ── Shared helpers for releasing an order (cancel / payment failure) ──

async function readMenuForRestock(tx: Transaction, items: { menuItemId: string }[]) {
  const refs = items.map((i) => adminDb.collection("menuItems").doc(i.menuItemId));
  const docs = await Promise.all(refs.map((r) => tx.get(r)));
  return { refs, docs };
}

function writeRestock(
  tx: Transaction,
  items: { quantity: number }[],
  menu: { refs: DocumentReference[]; docs: FirebaseFirestore.DocumentSnapshot[] }
) {
  menu.docs.forEach((d, i) => {
    if (!d.exists) return;
    const m = d.data()!;
    if (m.stock == null) return;
    const s = m.stock + items[i].quantity;
    // Only clear soldOut if it was caused by stock running out.
    tx.update(menu.refs[i], m.soldOut && m.stock <= 0 ? { stock: s, soldOut: false, available: true } : { stock: s });
  });
}

function creditWallet(
  tx: Transaction,
  walletRef: DocumentReference,
  walletSnap: FirebaseFirestore.DocumentSnapshot,
  p: { studentId: string; amount: number; method: string; note: string; orderId?: string; createdBy: string }
): number {
  const nowIso = new Date().toISOString();
  const bal = walletSnap.exists ? walletSnap.data()!.balance || 0 : 0;
  const newBal = bal + p.amount;
  if (walletSnap.exists) {
    // Crediting a closed wallet reopens it — same rule as admin top-up.
    const upd: Record<string, unknown> = { balance: newBal, updatedAt: nowIso };
    if (walletSnap.data()!.closedAt) {
      upd.closedAt = null;
      upd.reactivatedAt = nowIso;
    }
    tx.update(walletRef, upd);
  } else {
    tx.set(walletRef, { studentId: p.studentId, balance: newBal, walletCode: null, createdAt: nowIso, updatedAt: nowIso });
  }
  tx.set(adminDb.collection("wallet_transactions").doc(), {
    studentId: p.studentId,
    amount: p.amount,
    type: "refund",
    method: p.method,
    orderId: p.orderId || null,
    note: p.note,
    balanceAfter: newBal,
    createdAt: nowIso,
    createdBy: p.createdBy,
  });
  return newBal;
}

// ── Status changes ──

export interface StatusChangeResult {
  id: string;
  from: OrderStatus;
  to: OrderStatus;
  refunded: number;
  order: FirebaseFirestore.DocumentData;
}

export async function changeOrderStatus(
  orderId: string,
  to: OrderStatus,
  actor: string,
  reason?: string
): Promise<StatusChangeResult> {
  const orderRef = adminDb.collection("orders").doc(orderId);

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new OrderError("NOT_FOUND", "訂單不存在", 404);
    const o = snap.data()!;
    const from = o.status as OrderStatus;

    if (from === to) return { id: orderId, from, to, refunded: 0, order: o };
    if (!TRANSITIONS[from]?.includes(to)) {
      throw new OrderError("BAD_TRANSITION", `無法從「${from}」改為「${to}」`, 409);
    }

    const releasing = to === "cancelled" || to === "payment_failed";
    let refundAmount = 0;
    let menu: Awaited<ReturnType<typeof readMenuForRestock>> | null = null;
    let walletRef: DocumentReference | null = null;
    let walletSnap: FirebaseFirestore.DocumentSnapshot | null = null;

    if (releasing) {
      menu = await readMenuForRestock(tx, o.items || []);
      const paid = o.paymentStatus === "paid" && (o.paymentMethod === "wallet" || o.paymentMethod === "ecpay");
      if (paid && !o.refunded && o.totalPrice > 0 && o.studentId && o.studentId !== "POS") {
        walletRef = adminDb.collection("wallets").doc(o.studentId);
        walletSnap = await tx.get(walletRef);
        refundAmount = o.totalPrice;
      }
    }

    // ── writes ──
    const nowTs = new Date();
    const upd: Record<string, unknown> = { status: to, updatedAt: nowTs.toISOString(), updatedBy: actor };
    const stamp: Partial<Record<OrderStatus, string>> = {
      confirmed: "confirmedAt", ready: "readyAt", picked_up: "pickedUpAt", cancelled: "cancelledAt", payment_failed: "paymentFailedAt",
    };
    if (stamp[to]) upd[stamp[to]!] = nowTs;
    if (reason) upd.statusReason = cleanText(reason, 200);

    if (menu) writeRestock(tx, o.items || [], menu);
    if (walletRef && walletSnap && refundAmount > 0) {
      creditWallet(tx, walletRef, walletSnap, {
        studentId: o.studentId,
        amount: refundAmount,
        method: o.paymentMethod === "ecpay" ? "ecpay_to_wallet" : "wallet",
        orderId,
        note: `訂單 #${String(o.orderNumber).slice(-4)} 取消退款${o.paymentMethod === "ecpay" ? "（線上付款退回錢包）" : ""}`,
        createdBy: actor,
      });
      upd.refunded = true;
      upd.refundedAt = nowTs.toISOString();
      upd.refundAmount = refundAmount;
    }
    tx.update(orderRef, upd);

    return { id: orderId, from, to, refunded: refundAmount, order: { ...o, ...upd } };
  });
}

// ── Payments (ECPay) ──

export interface PaymentDoc {
  merchantTradeNo: string;
  purpose: "order" | "top_up";
  studentId: string;
  amount: number;
  orderId: string | null;
  status: "created" | "paid" | "failed" | "late_paid";
  createdAt: string;
  paidAt?: string;
  tradeNo?: string;
  paymentType?: string;
  mode: "stage" | "production";
}

/**
 * Apply a verified "paid" result. Idempotent: replays (ECPay retries the
 * notify up to several times) are no-ops.
 */
export async function applyPaymentSuccess(p: {
  merchantTradeNo: string;
  amount: number;
  tradeNo: string;
  paymentType: string;
  paymentDate: string;
  merchantId: string;
  expectedMerchantId: string;
  /** Mode of the config that verified this callback. */
  mode: "stage" | "production";
  source: "notify" | "result" | "query";
}): Promise<{ ok: boolean; outcome: string; orderId?: string | null; purpose?: string }> {
  if (p.merchantId !== p.expectedMerchantId) return { ok: false, outcome: "merchant_mismatch" };
  const payRef = adminDb.collection("payments").doc(p.merchantTradeNo);

  return adminDb.runTransaction(async (tx) => {
    const paySnap = await tx.get(payRef);
    if (!paySnap.exists) return { ok: false, outcome: "unknown_trade" };
    const pay = paySnap.data() as PaymentDoc;

    // A payment created under one mode can only be settled by a callback
    // verified under the same mode (stage keys are public).
    if (pay.mode !== p.mode) {
      tx.update(payRef, { lastError: `mode mismatch: ${p.mode}`, lastErrorAt: new Date().toISOString() });
      return { ok: false, outcome: "mode_mismatch" };
    }
    if (pay.amount !== p.amount) {
      tx.update(payRef, { lastError: `amount mismatch: got ${p.amount}`, lastErrorAt: new Date().toISOString() });
      return { ok: false, outcome: "amount_mismatch" };
    }
    if (pay.status === "paid" || pay.status === "late_paid") {
      return { ok: true, outcome: "already_applied", orderId: pay.orderId, purpose: pay.purpose };
    }

    const nowIso = new Date().toISOString();
    const walletRef = adminDb.collection("wallets").doc(pay.studentId);
    const payUpd = {
      paidAt: nowIso,
      tradeNo: p.tradeNo,
      paymentType: p.paymentType,
      gatewayPaymentDate: p.paymentDate,
      confirmedVia: p.source,
    };

    if (pay.purpose === "top_up") {
      const walletSnap = await tx.get(walletRef);
      const bal = walletSnap.exists ? walletSnap.data()!.balance || 0 : 0;
      const newBal = bal + pay.amount;
      if (walletSnap.exists) {
        const upd: Record<string, unknown> = { balance: newBal, updatedAt: nowIso };
        if (walletSnap.data()!.closedAt) { upd.closedAt = null; upd.reactivatedAt = nowIso; }
        tx.update(walletRef, upd);
      } else {
        tx.set(walletRef, { studentId: pay.studentId, balance: newBal, walletCode: null, createdAt: nowIso, updatedAt: nowIso });
      }
      tx.set(adminDb.collection("wallet_transactions").doc(), {
        studentId: pay.studentId,
        amount: pay.amount,
        type: "top_up",
        method: "ecpay",
        merchantTradeNo: p.merchantTradeNo,
        note: `線上儲值（綠界 ${p.tradeNo}）`,
        balanceAfter: newBal,
        createdAt: nowIso,
        createdBy: "ecpay",
      });
      tx.update(payRef, { ...payUpd, status: "paid" });
      return { ok: true, outcome: "wallet_credited", purpose: "top_up", orderId: null };
    }

    // purpose === "order"
    const orderRef = adminDb.collection("orders").doc(pay.orderId!);
    const orderSnap = await tx.get(orderRef);
    const o = orderSnap.exists ? orderSnap.data()! : null;

    if (o && o.status === "awaiting_payment") {
      tx.update(orderRef, { status: "pending", paymentStatus: "paid", paidAt: nowIso, gatewayTradeNo: p.tradeNo });
      tx.update(payRef, { ...payUpd, status: "paid" });
      return { ok: true, outcome: "order_paid", orderId: pay.orderId, purpose: "order" };
    }

    // The order was already released (timed out / cancelled) before the money
    // arrived. Never lose the student's money: credit it to their wallet.
    const walletSnap = await tx.get(walletRef);
    creditWallet(tx, walletRef, walletSnap, {
      studentId: pay.studentId,
      amount: pay.amount,
      method: "ecpay_to_wallet",
      orderId: pay.orderId || undefined,
      note: `訂單逾時後才完成付款，款項已轉入錢包（綠界 ${p.tradeNo}）`,
      createdBy: "ecpay",
    });
    if (o) tx.update(orderRef, { paymentStatus: "paid", refunded: true, refundAmount: pay.amount, refundedAt: nowIso });
    tx.update(payRef, { ...payUpd, status: "late_paid" });
    return { ok: true, outcome: "late_paid_to_wallet", orderId: pay.orderId, purpose: "order" };
  });
}

export async function markPaymentFailed(merchantTradeNo: string, reason: string) {
  const payRef = adminDb.collection("payments").doc(merchantTradeNo);
  const pay = await payRef.get();
  if (!pay.exists) return;
  const d = pay.data() as PaymentDoc;
  if (d.status !== "created") return;
  await payRef.update({ status: "failed", failedAt: new Date().toISOString(), failReason: cleanText(reason, 200) });
  if (d.purpose === "order" && d.orderId) {
    await changeOrderStatus(d.orderId, "payment_failed", "ecpay", reason).catch(() => {});
  }
}

/**
 * Release online-payment orders that were never paid. Called lazily from the
 * admin order feed so no cron is needed.
 */
let lastExpirySweep = 0;
export async function expireStalePaymentOrders(): Promise<number> {
  if (Date.now() - lastExpirySweep < 60_000) return 0;
  lastExpirySweep = Date.now();
  const cutoff = new Date(Date.now() - PAYMENT_TIMEOUT_MS);
  const snap = await adminDb
    .collection("orders")
    .where("status", "==", "awaiting_payment")
    .limit(50)
    .get();
  let n = 0;
  for (const d of snap.docs) {
    const created = d.data().createdAt?.toDate?.() as Date | undefined;
    if (created && created < cutoff) {
      await changeOrderStatus(d.id, "payment_failed", "system", "付款逾時").then(() => n++).catch(() => {});
      const mtn = d.data().merchantTradeNo;
      if (mtn) {
        await adminDb.collection("payments").doc(mtn).update({ status: "failed", failReason: "timeout", failedAt: new Date().toISOString() }).catch(() => {});
      }
    }
  }
  return n;
}

/** Strip identity fields for viewers who don't own the order. */
export function publicOrderView(id: string, o: FirebaseFirestore.DocumentData) {
  return {
    id,
    orderNumber: o.orderNumber,
    department: o.department,
    status: o.status,
    totalPrice: o.totalPrice,
    items: o.items,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    pickupDate: o.pickupDate || null,
    pickupTime: o.pickupTime || null,
    createdAt: o.createdAt?.toDate?.()?.toISOString?.() ?? null,
  };
}
