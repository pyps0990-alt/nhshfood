"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStudentAuth, useStudentAuthHydrated } from "@/lib/student-auth";
import { useT } from "@/lib/i18n";
import { Segmented } from "@/components/glass/Segmented";
import { NavBar, IconButton } from "@/components/glass/NavBar";
import { usePaymentStatus } from "@/components/glass/PaymentMethodPicker";
import { MemberBarcode } from "@/components/MemberBarcode";
import { IconWallet, IconEye, IconEyeOff, IconArrowUp, IconArrowDown, IconBarcode, IconInbox, IconChevronRight } from "@/components/Icons";

interface WalletInfo {
  studentId: string;
  balance: number;
  walletCode: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  method: string;
  note: string | null;
  balanceAfter: number;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  top_up: "儲值",
  payment: "付款",
  refund: "退款",
  admin_note: "備註",
};

const methodLabels: Record<string, string> = {
  cash: "現金",
  bank_transfer: "銀行轉帳",
  admin_adjustment: "調整",
  wallet: "錢包",
  ecpay: "線上儲值",
  ecpay_to_wallet: "線上付款退回",
  cash_refund: "現金退費",
  reactivate: "重新啟用",
};

const TOPUP_PRESETS = [100, 200, 500, 1000];

function OnlineTopUp({ onDone }: { onDone?: () => void }) {
  const status = usePaymentStatus();
  const [amount, setAmount] = useState<number>(200);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  void onDone;

  if (!status?.enabled) return null;
  const value = custom ? parseInt(custom, 10) || 0 : amount;
  const valid = value >= status.topUpMin && value <= status.topUpMax;

  async function go() {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/payments/ecpay/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "top_up", amount: value }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "無法建立付款");
      window.location.href = d.redirectUrl;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "無法建立付款");
      setBusy(false);
    }
  }

  return (
    <div className="lg-card p-4 space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <p className="font-semibold lg-ink">線上儲值</p>
        <span className="text-[11px] lg-ink-3">{status.mode === "stage" ? "測試環境・不會真的扣款" : "信用卡・Apple Pay"}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {TOPUP_PRESETS.map((p) => (
          <button key={p} type="button" aria-pressed={!custom && amount === p} onClick={() => { setAmount(p); setCustom(""); }} className="lg-chip justify-center tabular-nums">
            ${p}
          </button>
        ))}
      </div>
      <input
        inputMode="numeric"
        value={custom}
        onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 5))}
        placeholder={`自訂金額（$${status.topUpMin}～$${status.topUpMax}）`}
        aria-label="自訂儲值金額"
        className="lg-field lg-pill"
      />
      <button onClick={go} disabled={busy || !valid} className="lg-btn lg-btn-lg w-full lg-tinted">
        {busy ? "前往付款…" : `儲值 $${value || 0}`}
      </button>
      {err && <p className="text-[13px] text-red-500 text-center" role="alert">{err}</p>}
    </div>
  );
}

type TxFilter = "all" | "top_up" | "payment" | "refund";

export default function WalletPage() {
  return (
    <Suspense>
      <WalletPageInner />
    </Suspense>
  );
}

function WalletPageInner() {
  const router = useRouter();
  const { student } = useStudentAuth();
  const hydrated = useStudentAuthHydrated();
  const t = useT();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState<TxFilter>("all");
  const paymentFlag = useSearchParams().get("payment");

  const fetchWallet = useCallback(async () => {
    if (!student) return;
    setError("");
    try {
      const [wRes, tRes] = await Promise.all([
        fetch(`/api/wallet?studentId=${encodeURIComponent(student.studentId)}`),
        fetch(`/api/wallet/transactions?studentId=${encodeURIComponent(student.studentId)}`),
      ]);
      if (wRes.ok) {
        setWallet(await wRes.json());
      } else {
        const data = await wRes.json().catch(() => ({}));
        setError(data.error || "無法載入錢包");
      }
      if (tRes.ok) setTransactions(await tRes.json());
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    if (!hydrated) return;
    if (!student) { router.push("/login"); return; }
    fetchWallet();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchWallet();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [hydrated, student, router, fetchWallet]);

  /* Derived stats */
  const totalIn = transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const totalOut = transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const filteredTx = filter === "all" ? transactions : transactions.filter(tx => tx.type === filter);

  if (!student || loading) {
    return (
      <div className="flex-1 flex flex-col">
        <NavBar backHref="/" title={t("wallet")} />
        <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-3 animate-pulse">
          {/* Balance card skeleton */}
          <div className="rounded-[28px] lg-tinted opacity-70 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="h-3 w-16 bg-white/20 rounded mb-2" />
                <div className="h-8 w-24 bg-white/25 rounded" />
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-xl" />
            </div>
            <div className="flex gap-4 pt-2 border-t border-white/10">
              <div className="flex-1"><div className="h-3 w-12 bg-white/15 rounded mb-1" /><div className="h-4 w-16 bg-white/20 rounded" /></div>
              <div className="flex-1"><div className="h-3 w-12 bg-white/15 rounded mb-1" /><div className="h-4 w-16 bg-white/20 rounded" /></div>
            </div>
          </div>
          {/* Transaction skeletons */}
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-[20px] lg-thin">
              <div className="w-9 h-9 rounded-xl bg-stone-200 dark:bg-stone-700" />
              <div className="flex-1">
                <div className="h-3.5 w-20 bg-stone-200 dark:bg-stone-700 rounded mb-1.5" />
                <div className="h-2.5 w-14 bg-stone-200 dark:bg-stone-700 rounded" />
              </div>
              <div className="h-4 w-12 bg-stone-200 dark:bg-stone-700 rounded" />
            </div>
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <NavBar
        large
        backHref="/"
        title={t("wallet")}
        right={
          <IconButton label="會員條碼" onClick={() => setShowBarcode(!showBarcode)}>
            <IconBarcode size={18} />
          </IconButton>
        }
      />

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-3">
        {error && (
          <div className="lg-card px-4 py-3 text-red-600 dark:text-red-400 text-sm animate-fade-in" role="alert">
            {error}
          </div>
        )}

        {paymentFlag === "success" && (
          <div className="lg-card px-4 py-3 text-emerald-700 dark:text-emerald-400 text-sm font-medium lg-rise" role="status">儲值成功，餘額已更新。</div>
        )}
        {paymentFlag === "failed" && (
          <div className="lg-card px-4 py-3 text-red-600 dark:text-red-400 text-sm font-medium lg-rise" role="alert">付款未完成，未扣款也未入帳。</div>
        )}

        {/* === Balance Card === */}
        <div className="relative overflow-hidden rounded-[30px] lg-tinted p-5 lg-rise">
          <div className="absolute -top-12 -right-10 w-44 h-44 bg-white/15 rounded-full blur-2xl" />

          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white/70 text-xs font-medium">{t("wallet_balance")}</p>
              <p className="text-[42px] leading-none font-bold mt-1.5 tabular-nums tracking-tight" style={{ fontFamily: "var(--font-rounded)" }}>${wallet?.balance ?? 0}</p>
            </div>
            <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
              <IconWallet size={20} />
            </div>
          </div>

          <div className="relative flex items-center gap-4 pt-3 mt-1 border-t border-white/20">
            <div className="flex-1">
              <p className="text-white/50 text-[10px] mb-0.5">{t("wallet_code")}</p>
              <button
                onClick={() => setShowCode(!showCode)}
                className="font-mono text-sm font-bold tracking-widest flex items-center gap-1.5"
              >
                {showCode ? wallet?.walletCode : "--------"}
                {showCode ? <IconEyeOff size={13} className="opacity-50" /> : <IconEye size={13} className="opacity-50" />}
              </button>
            </div>
          </div>
        </div>

        {/* === Quick Stats — income / expense summary === */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="card-premium p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <IconArrowDown size={14} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">總收入</span>
            </div>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">+${totalIn}</p>
          </div>
          <div className="card-premium p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <IconArrowUp size={14} className="text-red-500 dark:text-red-400" />
              </div>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">總支出</span>
            </div>
            <p className="text-lg font-black text-red-500 dark:text-red-400 font-mono">-${totalOut}</p>
          </div>
        </div>

        {/* === Barcode (collapsible) === */}
        {showBarcode && (
          <div className="card-premium p-4 animate-fade-in">
            <div className="bg-white dark:bg-stone-800 rounded-lg p-3">
              <MemberBarcode value={student.studentId} height={48} className="text-stone-900 dark:text-stone-100" />
              <p className="text-center text-stone-400 text-[10px] font-mono mt-1.5 tracking-[0.2em]">{student.studentId}</p>
            </div>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 text-center mt-2">
              出示條碼進行身分辨識、累積點數、櫃台儲值
            </p>
          </div>
        )}

        {/* === Online top-up (ECPay) === */}
        <OnlineTopUp />

        {/* === Counter top-up info === */}
        <div className="card-premium p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <p className="text-xs font-semibold lg-ink-2">也可至熱食部櫃台以現金儲值</p>
          </div>
          <div className="flex gap-2">
            <a
              href="https://www.instagram.com/cyj._.1231"
              target="_blank"
              rel="noopener noreferrer"
              className="lg-btn lg-btn-sm flex-1 lg-thin lg-ink-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
              Instagram
            </a>
            <a
              href="mailto:pyps0990@gmail.com"
              className="lg-btn lg-btn-sm flex-1 lg-thin lg-ink-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>
              </svg>
              Email
            </a>
          </div>
        </div>

        {/* === Transaction History === */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[17px] font-bold lg-ink px-1">交易紀錄</h2>
            <span className="text-[10px] text-stone-400 font-medium">{filteredTx.length} 筆</span>
          </div>

          {/* Filter tabs */}
          <Segmented
            className="mb-3"
            ariaLabel="篩選交易"
            value={filter}
            onChange={setFilter}
            options={[{ value: "all", label: "全部" }, { value: "top_up", label: "儲值" }, { value: "payment", label: "付款" }, { value: "refund", label: "退款" }]}
          />

          {/* Transaction list */}
          {filteredTx.length === 0 ? (
            <div className="card-premium p-8 text-center">
              <IconInbox size={28} className="text-stone-300 dark:text-stone-600 mx-auto mb-2" />
              <p className="text-stone-400 dark:text-stone-500 text-xs">
                {filter === "all" ? "尚無交易紀錄" : `無${(["top_up", "payment", "refund"] as const).includes(filter as "top_up" | "payment" | "refund") ? typeLabels[filter] : ""}紀錄`}
              </p>
            </div>
          ) : (
            <div className="lg-card lg-list">
              {filteredTx.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="w-full px-4 py-3 flex items-center justify-between active:bg-black/5 dark:active:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      tx.amount > 0
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400"
                    }`}>
                      {tx.amount > 0 ? <IconArrowDown size={14} /> : <IconArrowUp size={14} />}
                    </div>
                    <div className="text-left">
                      <p className="text-[14px] font-semibold lg-ink">
                        {typeLabels[tx.type] || tx.type}
                        {tx.note && <span className="text-stone-400 dark:text-stone-500 font-normal"> · {tx.note}</span>}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        <span className="mx-1">·</span>
                        {methodLabels[tx.method] || tx.method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono text-sm font-bold ${tx.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                      {tx.amount > 0 ? "+" : "-"}${Math.abs(tx.amount)}
                    </span>
                    <IconChevronRight size={12} className="text-stone-300 dark:text-stone-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4" />
      </main>

      {/* === Transaction Detail Modal === */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedTx(null)}>
          <div className="absolute inset-0 bg-black/25 animate-backdrop-in" />
          <div
            className="relative w-full max-w-md mx-3 mb-3 sm:mb-0 lg-thick rounded-[30px] overflow-hidden animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium lg-ink-3">{typeLabels[selectedTx.type] || selectedTx.type}</p>
                <p className={`text-[30px] font-bold mt-0.5 tabular-nums ${selectedTx.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {selectedTx.amount > 0 ? "+" : "-"}${Math.abs(selectedTx.amount)}
                </p>
              </div>
              <button onClick={() => setSelectedTx(null)} aria-label="關閉" className="lg-btn lg-btn-icon lg-thin lg-ink-2 !w-9 !min-h-9">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="p-5 space-y-3">
              {[
                ["交易類型", typeLabels[selectedTx.type] || selectedTx.type],
                ["付款方式", methodLabels[selectedTx.method] || selectedTx.method],
                ["交易後餘額", `$${selectedTx.balanceAfter}`],
                ["時間", new Date(selectedTx.createdAt).toLocaleString("zh-TW", {
                  year: "numeric", month: "2-digit", day: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                })],
                ...(selectedTx.note ? [["備註", selectedTx.note]] : []),
                ["交易編號", selectedTx.id.slice(0, 12) + "..."],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="lg-ink-3 text-xs">{label}</span>
                  <span className={`font-medium lg-ink text-xs text-right ${label === "交易編號" ? "font-mono text-stone-400 dark:text-stone-500" : ""} ${label === "交易後餘額" ? "font-mono font-bold" : ""}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
