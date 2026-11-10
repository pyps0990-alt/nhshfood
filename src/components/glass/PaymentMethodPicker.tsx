"use client";

import { useEffect, useState } from "react";

export type PayMethod = "cash" | "wallet" | "ecpay";

interface PaymentStatus { enabled: boolean; mode: "stage" | "production" | null; topUpMin: number; topUpMax: number }

let cached: Promise<PaymentStatus> | null = null;
export function fetchPaymentStatus(): Promise<PaymentStatus> {
  if (!cached) {
    cached = fetch("/api/payments/ecpay/status")
      .then((r) => r.json())
      .catch(() => ({ enabled: false, mode: null, topUpMin: 50, topUpMax: 5000 }));
  }
  return cached;
}

export function usePaymentStatus() {
  const [s, setS] = useState<PaymentStatus | null>(null);
  useEffect(() => { fetchPaymentStatus().then(setS); }, []);
  return s;
}

const ICONS: Record<PayMethod, React.ReactNode> = {
  cash: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></svg>
  ),
  wallet: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7V5a2 2 0 00-2-2H5a2 2 0 000 4h15a1 1 0 011 1v4h-3a2 2 0 000 4h3a1 1 0 001-1v-2" /><path d="M3 5v14a2 2 0 002 2h15a1 1 0 001-1v-4" /></svg>
  ),
  ecpay: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20M6 15h4" /></svg>
  ),
};

export function PaymentMethodPicker({
  value,
  onChange,
  total,
  walletBalance,
  ecpayAllowed = true,
  ecpayHint,
}: {
  value: PayMethod;
  onChange: (m: PayMethod) => void;
  total: number;
  walletBalance: number | null;
  /** e.g. false when another department in the same checkout already uses it */
  ecpayAllowed?: boolean;
  ecpayHint?: string;
}) {
  const status = usePaymentStatus();
  const walletOk = walletBalance !== null && walletBalance >= total;

  const options: { key: PayMethod; label: string; sub: string; enabled: boolean }[] = [
    { key: "cash", label: "現金", sub: "取餐時付款", enabled: true },
    {
      key: "wallet",
      label: "校園錢包",
      sub: walletBalance === null ? "未開通" : walletOk ? `餘額 $${walletBalance}` : `餘額不足（$${walletBalance}）`,
      enabled: walletOk,
    },
  ];
  if (status?.enabled) {
    options.push({
      key: "ecpay",
      label: "線上付款",
      sub: !ecpayAllowed ? ecpayHint || "一次限一筆" : status.mode === "stage" ? "信用卡・Apple Pay（測試）" : "信用卡・Apple Pay",
      enabled: ecpayAllowed && total > 0,
    });
  }

  // If the current choice became unavailable (e.g. balance dropped), fall back.
  useEffect(() => {
    const cur = options.find((o) => o.key === value);
    if (cur && !cur.enabled) onChange("cash");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletOk, ecpayAllowed, status?.enabled]);

  return (
    <div role="radiogroup" aria-label="付款方式" className={`grid gap-2 ${options.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={!o.enabled}
            onClick={() => o.enabled && onChange(o.key)}
            className={`relative flex flex-col items-start gap-1.5 rounded-[20px] p-3 text-left transition-all duration-300 disabled:opacity-45 ${
              active ? "lg-tinted" : "lg-thin lg-ink"
            }`}
          >
            <span className={active ? "text-white" : "lg-brand"}>{ICONS[o.key]}</span>
            <span className="text-[14px] font-semibold leading-none">{o.label}</span>
            <span className={`text-[11px] leading-tight ${active ? "text-white/85" : "lg-ink-3"}`}>{o.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
