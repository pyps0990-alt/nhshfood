import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getEcpayConfig, parseVerifiedResult, publicBaseUrl, readFormParams, verifyCheckMacValue } from "@/lib/payments/ecpay";
import { applyPaymentSuccess } from "@/lib/orders";
import { notifyOrderPaid } from "@/lib/order-notify";

// Browser POST from ECPay after the payment page (OrderResultURL).
// This is user-controlled transport, so it is only trusted after MAC
// verification — exactly like the server notify.
export async function POST(req: NextRequest) {
  const base = publicBaseUrl(req);
  const cfg = getEcpayConfig();
  const params = await readFormParams(req);
  const mtn = /^[A-Z0-9]{10,20}$/.test(params.MerchantTradeNo || "") ? params.MerchantTradeNo : null;

  let dest = "/";
  if (mtn) {
    const pay = await adminDb.collection("payments").doc(mtn).get();
    if (pay.exists) {
      const d = pay.data()!;
      dest = d.purpose === "order" ? `/order/${d.orderId}` : "/wallet";
    }
  }

  let flag = "pending";
  if (cfg && mtn && verifyCheckMacValue(params, cfg)) {
    const r = parseVerifiedResult(params);
    if (r.success && !(r.simulated && cfg.mode === "production")) {
      const out = await applyPaymentSuccess({
        merchantTradeNo: r.merchantTradeNo,
        amount: r.amount,
        tradeNo: r.tradeNo,
        paymentType: r.paymentType,
        paymentDate: r.paymentDate,
        merchantId: params.MerchantID,
        expectedMerchantId: cfg.merchantId,
        source: "result",
      }).catch(() => null);
      flag = out?.ok ? "success" : "pending";
      if (out?.outcome === "order_paid" && out.orderId) notifyOrderPaid(out.orderId).catch(() => {});
    } else if (!r.success) {
      flag = "failed";
    }
  }

  const url = new URL(dest, base);
  url.searchParams.set("payment", flag);
  // 303 so the browser switches the cross-site POST into a same-site GET
  // (and the lax session cookie is sent again).
  return NextResponse.redirect(url, 303);
}
