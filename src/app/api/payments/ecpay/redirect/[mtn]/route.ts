import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { getStudentSession } from "@/lib/auth";
import { buildCheckoutForm, getEcpayConfig, publicBaseUrl, renderAutoSubmitForm } from "@/lib/payments/ecpay";
import type { PaymentDoc } from "@/lib/orders";

// Browser lands here, gets an auto-submitting form that POSTs to ECPay.
export async function GET(req: NextRequest, { params }: { params: Promise<{ mtn: string }> }) {
  const { mtn } = await params;
  if (!/^[A-Z0-9]{10,20}$/.test(mtn)) return new NextResponse("Bad request", { status: 400 });

  const session = await getStudentSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const cfg = getEcpayConfig();
  if (!cfg) return new NextResponse("線上付款尚未開放", { status: 503 });

  const snap = await adminDb.collection("payments").doc(mtn).get();
  if (!snap.exists) return new NextResponse("Not found", { status: 404 });
  const pay = snap.data() as PaymentDoc;
  if (pay.studentId !== session.studentId) return new NextResponse("Forbidden", { status: 403 });

  const base = publicBaseUrl(req);
  const backPath = pay.purpose === "order" ? `/order/${pay.orderId}` : "/wallet";
  if (pay.status !== "created") return NextResponse.redirect(new URL(backPath, base));

  let itemNames = ["校園錢包儲值"];
  if (pay.purpose === "order" && pay.orderId) {
    const o = await adminDb.collection("orders").doc(pay.orderId).get();
    if (!o.exists || o.data()!.status !== "awaiting_payment") return NextResponse.redirect(new URL(backPath, base));
    itemNames = (o.data()!.items || []).map((i: { name: string; quantity: number }) => `${i.name} x${i.quantity}`);
  }

  const form = buildCheckoutForm(cfg, {
    merchantTradeNo: mtn,
    amount: pay.amount,
    itemNames,
    tradeDesc: "內湖高中熱食部",
    returnUrl: `${base}/api/payments/ecpay/notify`,
    orderResultUrl: `${base}/api/payments/ecpay/result`,
    clientBackUrl: `${base}${backPath}`,
    customField1: pay.purpose,
  });

  const nonce = randomBytes(16).toString("base64");
  return new NextResponse(renderAutoSubmitForm(form, nonce), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; form-action https://payment-stage.ecpay.com.tw https://payment.ecpay.com.tw; frame-ancestors 'none'; base-uri 'none'`,
      "Referrer-Policy": "no-referrer",
    },
  });
}
