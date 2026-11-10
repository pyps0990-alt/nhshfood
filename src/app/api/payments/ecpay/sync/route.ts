import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getSession, getStudentSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getEcpayConfig, queryTradeInfo } from "@/lib/payments/ecpay";
import { applyPaymentSuccess, type PaymentDoc } from "@/lib/orders";
import { notifyOrderPaid } from "@/lib/order-notify";

const schema = z.object({ merchantTradeNo: z.string().regex(/^[A-Z0-9]{10,20}$/) });

/**
 * Ask ECPay directly whether a trade was paid. Recovers from a missed
 * notify (e.g. ECPay couldn't reach us). Owner or admin only.
 */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "參數錯誤" }, { status: 400 });
  const mtn = parsed.data.merchantTradeNo;

  const [admin, student] = await Promise.all([getSession(), getStudentSession()]);
  if (!admin && !student) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!rateLimit(`pay-sync:${admin?.username || student?.studentId}`, 12, 60 * 1000).allowed) {
    return NextResponse.json({ error: "請稍後再試" }, { status: 429 });
  }

  const cfg = getEcpayConfig();
  if (!cfg) return NextResponse.json({ error: "線上付款尚未開放" }, { status: 503 });

  const snap = await adminDb.collection("payments").doc(mtn).get();
  if (!snap.exists) return NextResponse.json({ error: "找不到付款紀錄" }, { status: 404 });
  const pay = snap.data() as PaymentDoc;
  if (!admin && pay.studentId !== student!.studentId) {
    return NextResponse.json({ error: "無權查詢" }, { status: 403 });
  }
  if (pay.status === "paid" || pay.status === "late_paid") {
    return NextResponse.json({ status: pay.status });
  }

  try {
    const q = await queryTradeInfo(cfg, mtn);
    if (!q.paid) return NextResponse.json({ status: pay.status, gateway: "unpaid" });
    const r = await applyPaymentSuccess({
      merchantTradeNo: mtn,
      amount: q.amount,
      tradeNo: q.tradeNo,
      paymentType: q.paymentType,
      paymentDate: q.paymentDate,
      merchantId: cfg.merchantId,
      expectedMerchantId: cfg.merchantId,
        mode: cfg.mode,
      source: "query",
    });
    if (r.outcome === "order_paid" && r.orderId) notifyOrderPaid(r.orderId).catch(() => {});
    return NextResponse.json({ status: r.ok ? "paid" : pay.status, outcome: r.outcome });
  } catch (err) {
    console.error("ecpay sync error:", err);
    return NextResponse.json({ error: "暫時無法向綠界查詢，請稍後再試" }, { status: 502 });
  }
}
