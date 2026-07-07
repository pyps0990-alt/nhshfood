"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStudentAuth } from "@/lib/student-auth";
import { useT } from "@/lib/i18n";
import { BackButton } from "@/components/BackButton";
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
};

const methodLabels: Record<string, string> = {
  cash: "現金",
  bank_transfer: "銀行轉帳",
  admin_adjustment: "調整",
  wallet: "錢包",
};

type TxFilter = "all" | "top_up" | "payment" | "refund";

export default function WalletPage() {
  const router = useRouter();
  const { student } = useStudentAuth();
  const t = useT();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState<TxFilter>("all");

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
    if (!student) { router.push("/login"); return; }
    fetchWallet();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchWallet();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [student, router, fetchWallet]);

  /* Derived stats */
  const totalIn = transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const totalOut = transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const filteredTx = filter === "all" ? transactions : transactions.filter(tx => tx.type === filter);

  if (!student || loading) {
    return (
      <div className="flex-1 flex flex-col">
        <header className="glass dark:bg-stone-900/85 border-b border-stone-200/50 dark:border-stone-800 px-5 py-3 flex items-center gap-3 sticky top-0 z-10">
          <BackButton href="/" />
          <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">{t("wallet")}</h1>
        </header>
        <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-3 animate-pulse">
          {/* Balance card skeleton */}
          <div className="rounded-2xl bg-gradient-to-br from-[#E23D28]/60 to-[#FF6B35]/60 p-5">
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
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-stone-100 dark:bg-stone-800/50">
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
      {/* Header */}
      <header className="glass dark:bg-stone-900/85 border-b border-stone-200/50 dark:border-stone-800 px-5 py-3 flex items-center gap-3 sticky top-0 z-10">
        <BackButton href="/" />
        <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">{t("wallet")}</h1>
        <div className="ml-auto">
          <button
            onClick={() => setShowBarcode(!showBarcode)}
            className={`p-2 rounded-lg transition-colors ${showBarcode ? "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"}`}
          >
            <IconBarcode size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-3">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* === Balance Card === */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E23D28] to-[#FF6B35] p-5 text-white shadow-lg">
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/8 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />

          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white/70 text-xs font-medium">{t("wallet_balance")}</p>
              <p className="text-3xl font-black mt-0.5">${wallet?.balance ?? 0}</p>
            </div>
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <IconWallet size={20} />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-white/15">
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

        {/* === Top-up Info === */}
        <div className="card-premium p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">請至熱食部櫃台或聯繫管理員儲值</p>
          </div>
          <div className="flex gap-2">
            <a
              href="https://www.instagram.com/cyj._.1231"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
              Instagram
            </a>
            <a
              href="mailto:pyps0990@gmail.com"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-semibold border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all active:scale-95"
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
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-200">交易紀錄</h2>
            <span className="text-[10px] text-stone-400 font-medium">{filteredTx.length} 筆</span>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 mb-3">
            {([["all", "全部"], ["top_up", "儲值"], ["payment", "付款"], ["refund", "退款"]] as [TxFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  filter === key
                    ? "bg-[#E23D28] text-white shadow-sm"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Transaction list */}
          {filteredTx.length === 0 ? (
            <div className="card-premium p-8 text-center">
              <IconInbox size={28} className="text-stone-300 dark:text-stone-600 mx-auto mb-2" />
              <p className="text-stone-400 dark:text-stone-500 text-xs">
                {filter === "all" ? "尚無交易紀錄" : `無${(["top_up", "payment", "refund"] as const).includes(filter as "top_up" | "payment" | "refund") ? typeLabels[filter] : ""}紀錄`}
              </p>
            </div>
          ) : (
            <div className="card-premium divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
              {filteredTx.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tx.amount > 0
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400"
                    }`}>
                      {tx.amount > 0 ? <IconArrowDown size={14} /> : <IconArrowUp size={14} />}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-backdrop-in" />
          <div
            className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-5 py-4 flex items-center justify-between ${
              selectedTx.amount > 0
                ? "bg-emerald-500"
                : "bg-red-500"
            } text-white`}>
              <div>
                <p className="text-xs font-medium opacity-80">{typeLabels[selectedTx.type] || selectedTx.type}</p>
                <p className="text-2xl font-black mt-0.5">
                  {selectedTx.amount > 0 ? "+" : "-"}${Math.abs(selectedTx.amount)}
                </p>
              </div>
              <button onClick={() => setSelectedTx(null)} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
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
                  <span className="text-stone-400 dark:text-stone-500 text-xs">{label}</span>
                  <span className={`font-medium text-stone-800 dark:text-stone-200 text-xs ${label === "交易編號" ? "font-mono text-stone-400 dark:text-stone-500" : ""} ${label === "交易後餘額" ? "font-mono font-bold" : ""}`}>
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
