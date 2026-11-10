/**
 * ECPay（綠界）全方位金流 AIO bridge.
 *
 * Env vars:
 *   ECPAY_MODE         "production" | "stage". Defaults to "stage" everywhere
 *                      except Vercel production, where ECPay stays DISABLED
 *                      until real credentials are set.
 *   ECPAY_MERCHANT_ID  特店編號
 *   ECPAY_HASH_KEY     HashKey
 *   ECPAY_HASH_IV      HashIV
 *   APP_BASE_URL       Public origin used for ECPay callbacks, e.g.
 *                      https://food.example.edu.tw  (falls back to the
 *                      request's host header)
 *
 * Security model:
 *   - Every message from ECPay is authenticated with CheckMacValue (SHA256),
 *     compared in constant time.
 *   - The amount and MerchantID in a callback must match what we stored when
 *     creating the payment. A valid MAC with a different amount is rejected.
 *   - Simulated payments (SimulatePaid=1, sent by the ECPay merchant back
 *     office "模擬付款" button) are only honoured in stage mode.
 */

import { createHash, timingSafeEqual } from "crypto";
import { taipeiEcpayDate } from "@/lib/time";

// Public test merchant published in ECPay's developer docs. Only ever used in stage mode.
const STAGE_DEFAULTS = {
  merchantId: "2000132",
  hashKey: "5294y06JbISpM5x9",
  hashIv: "v77hoKGq4kWxNNIS",
};

const HOSTS = {
  stage: "https://payment-stage.ecpay.com.tw",
  production: "https://payment.ecpay.com.tw",
} as const;

export type EcpayMode = keyof typeof HOSTS;

export interface EcpayConfig {
  mode: EcpayMode;
  merchantId: string;
  hashKey: string;
  hashIv: string;
}

/** Returns null when online payment must not be offered. */
export function getEcpayConfig(): EcpayConfig | null {
  const explicit = process.env.ECPAY_MODE;
  const isVercelProd = process.env.VERCEL_ENV === "production";
  const mode: EcpayMode = explicit === "production" ? "production" : explicit === "stage" ? "stage" : isVercelProd ? "production" : "stage";

  const merchantId = process.env.ECPAY_MERCHANT_ID;
  const hashKey = process.env.ECPAY_HASH_KEY;
  const hashIv = process.env.ECPAY_HASH_IV;

  if (merchantId && hashKey && hashIv) {
    return { mode, merchantId, hashKey, hashIv };
  }
  if (mode === "stage") return { mode, ...STAGE_DEFAULTS };
  return null; // production without credentials → disabled
}

export function ecpayHost(cfg: EcpayConfig) {
  return HOSTS[cfg.mode];
}

// ── CheckMacValue ─────────────────────────────────────────────────

/**
 * ECPay's URL-encoding is PHP urlencode() + lowercase, then a handful of
 * characters restored to match .NET's HttpUtility.UrlEncode.
 */
function ecpayUrlEncode(s: string): string {
  return encodeURIComponent(s)
    .replace(/%20/g, "+")
    .replace(/'/g, "%27")
    .replace(/~/g, "%7e")
    .toLowerCase();
  // encodeURIComponent already leaves - _ . ! * ( ) unescaped, which is
  // exactly the set ECPay restores after PHP urlencode.
}

export function computeCheckMacValue(
  params: Record<string, string | number>,
  hashKey: string,
  hashIv: string
): string {
  const keys = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const query = keys.map((k) => `${k}=${params[k]}`).join("&");
  const raw = `HashKey=${hashKey}&${query}&HashIV=${hashIv}`;
  return createHash("sha256").update(ecpayUrlEncode(raw)).digest("hex").toUpperCase();
}

export function verifyCheckMacValue(
  params: Record<string, string>,
  cfg: Pick<EcpayConfig, "hashKey" | "hashIv">
): boolean {
  const given = params.CheckMacValue;
  if (!given || !/^[0-9A-Fa-f]{64}$/.test(given)) return false;
  const expected = computeCheckMacValue(params, cfg.hashKey, cfg.hashIv);
  const a = Buffer.from(expected);
  const b = Buffer.from(given.toUpperCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Checkout ──────────────────────────────────────────────────────

/** 20-char alnum, unique per payment. Prefix O=order, T=top-up. */
export function newMerchantTradeNo(kind: "O" | "T"): string {
  const ts = Date.now().toString(36).toUpperCase(); // ~8 chars
  const rand = Array.from({ length: 20 - 1 - ts.length }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
  ).join("");
  // Randomness here is for uniqueness, not secrecy (the MAC protects integrity).
  return `${kind}${ts}${rand}`.slice(0, 20);
}

function clip(s: string, max: number) {
  // ECPay rejects some symbols in ItemName/TradeDesc; keep it conservative.
  return s.replace(/[#&=<>"'\\%]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export interface CheckoutInput {
  merchantTradeNo: string;
  amount: number;
  itemNames: string[];
  tradeDesc: string;
  returnUrl: string; // server-to-server notify
  orderResultUrl: string; // browser redirect after paying (POST)
  clientBackUrl: string; // "返回商店" button
  customField1?: string;
}

export function buildCheckoutForm(cfg: EcpayConfig, input: CheckoutInput) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error("invalid amount");
  const itemName = clip(input.itemNames.map((n) => clip(n, 50)).join("#"), 200) || "餐點";

  const params: Record<string, string | number> = {
    MerchantID: cfg.merchantId,
    MerchantTradeNo: input.merchantTradeNo,
    MerchantTradeDate: taipeiEcpayDate(),
    PaymentType: "aio",
    TotalAmount: input.amount,
    TradeDesc: clip(input.tradeDesc, 100) || "NHSH Food",
    ItemName: itemName,
    ReturnURL: input.returnUrl,
    OrderResultURL: input.orderResultUrl,
    ClientBackURL: input.clientBackUrl,
    ChoosePayment: "ALL",
    // Same-day pickup → only instant methods (credit card, Apple Pay, TWQR, WebATM).
    IgnorePayment: "ATM#CVS#BARCODE",
    EncryptType: 1,
    NeedExtraPaidInfo: "N",
  };
  if (input.customField1) params.CustomField1 = clip(input.customField1, 50);
  params.CheckMacValue = computeCheckMacValue(params, cfg.hashKey, cfg.hashIv);

  return {
    action: `${ecpayHost(cfg)}/Cashier/AioCheckOut/V5`,
    fields: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  };
}

/** Self-submitting HTML page that hands the browser over to ECPay. */
export function renderAutoSubmitForm(form: { action: string; fields: Record<string, string> }, nonce: string) {
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const inputs = Object.entries(form.fields)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join("");
  return `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>前往付款…</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:-apple-system,BlinkMacSystemFont,"PingFang TC",sans-serif;background:radial-gradient(120% 80% at 20% 0%,#ffd9c7 0%,#fff3ea 45%,#fff 100%);color:#1d1816}
.card{padding:28px 32px;border-radius:28px;background:rgba(255,255,255,.55);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);box-shadow:0 1px 0 rgba(255,255,255,.8) inset,0 20px 50px -20px rgba(226,61,40,.35);text-align:center}
.spin{width:28px;height:28px;margin:0 auto 14px;border-radius:50%;border:3px solid rgba(226,61,40,.2);border-top-color:#E23D28;animation:s 0.8s linear infinite}@keyframes s{to{transform:rotate(360deg)}}
button{margin-top:14px;padding:10px 20px;border:0;border-radius:999px;background:#E23D28;color:#fff;font-weight:600;font-size:15px}</style></head>
<body><form id="f" method="post" action="${esc(form.action)}">${inputs}<div class="card"><div class="spin"></div><div>正在前往綠界付款頁面…</div><noscript><button type="submit">前往付款</button></noscript></div></form>
<script nonce="${nonce}">document.getElementById("f").submit();</script></body></html>`;
}

// ── Callback parsing ──────────────────────────────────────────────

export async function readFormParams(req: Request): Promise<Record<string, string>> {
  const text = await req.text();
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(text)) out[k] = v;
  return out;
}

export interface VerifiedPaymentResult {
  merchantTradeNo: string;
  tradeNo: string;
  amount: number;
  success: boolean;
  simulated: boolean;
  paymentType: string;
  paymentDate: string;
  rtnMsg: string;
}

export function parseVerifiedResult(p: Record<string, string>): VerifiedPaymentResult {
  return {
    merchantTradeNo: p.MerchantTradeNo || "",
    tradeNo: p.TradeNo || "",
    amount: Number(p.TradeAmt || 0),
    success: p.RtnCode === "1",
    simulated: p.SimulatePaid === "1",
    paymentType: p.PaymentType || "",
    paymentDate: p.PaymentDate || "",
    rtnMsg: p.RtnMsg || "",
  };
}

// ── Active query (for missed callbacks) ───────────────────────────

export async function queryTradeInfo(cfg: EcpayConfig, merchantTradeNo: string) {
  const params: Record<string, string | number> = {
    MerchantID: cfg.merchantId,
    MerchantTradeNo: merchantTradeNo,
    TimeStamp: Math.floor(Date.now() / 1000),
  };
  params.CheckMacValue = computeCheckMacValue(params, cfg.hashKey, cfg.hashIv);
  const res = await fetch(`${ecpayHost(cfg)}/Cashier/QueryTradeInfo/V5`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const text = await res.text();
  const data: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(text)) data[k] = v;
  if (!verifyCheckMacValue(data, cfg)) throw new Error("QueryTradeInfo: bad CheckMacValue");
  if (data.MerchantID !== cfg.merchantId || data.MerchantTradeNo !== merchantTradeNo) {
    throw new Error("QueryTradeInfo: mismatched trade");
  }
  return {
    paid: data.TradeStatus === "1",
    amount: Number(data.TradeAmt || 0),
    tradeNo: data.TradeNo || "",
    paymentType: data.PaymentType || "",
    paymentDate: data.PaymentDate || "",
    raw: data,
  };
}

/** Public origin for callbacks. Prefer APP_BASE_URL so preview hosts can't be spoofed via Host header. */
export function publicBaseUrl(req: Request): string {
  const env = process.env.APP_BASE_URL;
  if (env) return env.replace(/\/+$/, "");
  const vercelUrl = process.env.VERCEL_ENV === "production"
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  const u = new URL(req.url);
  return u.origin;
}
