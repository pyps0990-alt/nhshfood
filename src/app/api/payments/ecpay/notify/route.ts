import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getEcpayConfig, parseVerifiedResult, readFormParams, verifyCheckMacValue } from "@/lib/payments/ecpay";
import { applyPaymentSuccess } from "@/lib/orders";
import { notifyOrderPaid } from "@/lib/order-notify";

// ECPay server → us (ReturnURL). Must reply exactly "1|OK" on success,
// otherwise ECPay retries. Anything we can't verify gets "0|..." and is logged.
function reply(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const cfg = getEcpayConfig();
  if (!cfg) return reply("0|disabled", 503);

  const params = await readFormParams(req);
  const ok = verifyCheckMacValue(params, cfg);

  // Keep a tamper-evident log of every callback (without the MAC secret inputs).
  await adminDb.collection("payment_events").add({
    source: "notify",
    merchantTradeNo: params.MerchantTradeNo || null,
    macValid: ok,
    rtnCode: params.RtnCode || null,
    amount: params.TradeAmt || null,
    simulated: params.SimulatePaid === "1",
    receivedAt: new Date().toISOString(),
    params,
  }).catch((e) => console.error("payment_events log failed", e));

  if (!ok) return reply("0|CheckMacValue Error", 400);

  const r = parseVerifiedResult(params);
  if (r.simulated && cfg.mode === "production") {
    // 綠界後台「模擬付款」 never moves real money.
    return reply("1|OK");
  }
  if (!r.success) return reply("1|OK"); // failures are handled by timeout / result page

  const result = await applyPaymentSuccess({
    merchantTradeNo: r.merchantTradeNo,
    amount: r.amount,
    tradeNo: r.tradeNo,
    paymentType: r.paymentType,
    paymentDate: r.paymentDate,
    merchantId: params.MerchantID,
    expectedMerchantId: cfg.merchantId,
        mode: cfg.mode,
    source: "notify",
  }).catch((e) => {
    console.error("applyPaymentSuccess error", e);
    return null;
  });

  if (!result) return reply("0|retry", 500); // transient → let ECPay retry
  if (!result.ok) {
    console.error("ECPay notify rejected:", result.outcome, r.merchantTradeNo);
    return reply(`0|${result.outcome}`, 400);
  }
  if (result.outcome === "order_paid" && result.orderId) {
    notifyOrderPaid(result.orderId).catch(() => {});
  }
  return reply("1|OK");
}
