"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { BackButton } from "@/components/BackButton";

interface WalletInfo {
  studentId: string;
  balance: number;
  walletCode: string;
  createdAt: string;
  closedAt?: string | null;
}

interface WalletListItem {
  studentId: string;
  balance: number;
  walletCode: string;
  createdAt: string | null;
  updatedAt: string | null;
  closedAt: string | null;
  studentName: string | null;
  displayName: string | null;
  className: string | null;
}

type FilterKey = "all" | "positive" | "zero" | "closed" | "low";

const filterOptions: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "positive", label: "有餘額" },
  { key: "low", label: "低餘額 (<$50)" },
  { key: "zero", label: "餘額為零" },
  { key: "closed", label: "已結清" },
];

interface Transaction {
  id: string;
  amount: number;
  type: "top_up" | "payment" | "refund";
  method: string;
  note: string | null;
  balanceAfter: number;
  createdAt: string;
  createdBy: string;
}

const methodLabels: Record<string, string> = {
  cash: "現金",
  bank_transfer: "銀行轉帳",
  admin_adjustment: "管理員調整",
  wallet: "錢包扣款",
  cash_refund: "現金退費",
};

const typeLabels: Record<string, string> = {
  top_up: "儲值",
  payment: "付款",
  refund: "退款",
};

export default function WalletAdminPage() {
  const [studentId, setStudentId] = useState("");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // List / filter
  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [listSearch, setListSearch] = useState("");

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/wallet");
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets || []);
      }
    } catch {
      // list errors are surfaced via empty state
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const filteredWallets = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return wallets.filter((w) => {
      if (filter === "positive" && (w.balance <= 0 || w.closedAt)) return false;
      if (filter === "zero" && (w.balance !== 0 || w.closedAt)) return false;
      if (filter === "low" && (w.balance <= 0 || w.balance >= 50 || w.closedAt)) return false;
      if (filter === "closed" && !w.closedAt) return false;
      if (q) {
        const hay = `${w.studentId} ${w.studentName || ""} ${w.displayName || ""} ${w.className || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [wallets, filter, listSearch]);

  const stats = useMemo(() => {
    const total = wallets.length;
    const active = wallets.filter((w) => !w.closedAt).length;
    const closed = wallets.filter((w) => w.closedAt).length;
    const totalBalance = wallets.reduce((s, w) => s + (w.closedAt ? 0 : w.balance), 0);
    return { total, active, closed, totalBalance };
  }, [wallets]);

  // Top-up form
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpMethod, setTopUpMethod] = useState("cash");
  const [topUpNote, setTopUpNote] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Close / refund
  const [closeReason, setCloseReason] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);
  const [refund, setRefund] = useState<{ refundCode: string; refundAmount: number } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  function openWallet(sid: string) {
    setStudentId(sid);
    // Defer the fetch so the state update is committed first.
    setTimeout(() => searchStudentById(sid), 0);
  }

  async function searchStudentById(sid: string) {
    if (!sid.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    setWallet(null);
    setTransactions([]);

    try {
      const res = await fetch(`/api/wallet?studentId=${encodeURIComponent(sid.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "查詢失敗");
        return;
      }
      setWallet(data);

      const txRes = await fetch(`/api/wallet/transactions?studentId=${encodeURIComponent(sid.trim())}`);
      if (txRes.ok) {
        setTransactions(await txRes.json());
      }
    } catch {
      setError("網路錯誤");
    } finally {
      setLoading(false);
    }
  }

  async function searchStudent() {
    if (!studentId.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    setWallet(null);
    setTransactions([]);

    try {
      const res = await fetch(`/api/wallet?studentId=${encodeURIComponent(studentId.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "查詢失敗");
        return;
      }
      setWallet(data);

      // Fetch transactions
      const txRes = await fetch(`/api/wallet/transactions?studentId=${encodeURIComponent(studentId.trim())}`);
      if (txRes.ok) {
        setTransactions(await txRes.json());
      }
    } catch {
      setError("網路錯誤");
    } finally {
      setLoading(false);
    }
  }

  async function handleClose() {
    if (!wallet || wallet.balance === 0) return;
    setCloseLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/wallet/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: wallet.studentId,
          reason: closeReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "結清失敗");
        return;
      }
      setRefund({ refundCode: data.refundCode, refundAmount: data.refundAmount });
      setConfirmClose(false);
      setCloseReason("");
      searchStudent();
      fetchList();
    } catch {
      setError("網路錯誤");
    } finally {
      setCloseLoading(false);
    }
  }

  function downloadHistoryCsv() {
    if (!wallet) return;
    window.location.href = `/api/wallet/transactions?studentId=${encodeURIComponent(wallet.studentId)}&format=csv`;
  }

  async function handleReactivate() {
    if (!wallet) return;
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/wallet/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: wallet.studentId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "操作失敗"); return; }
      setMessage("錢包已重新啟用");
      searchStudent();
      fetchList();
    } catch {
      setError("網路錯誤");
    }
  }

  async function handleTopUp() {
    const amount = parseInt(topUpAmount);
    if (!amount || amount <= 0 || amount > 10000) {
      setError("金額需在 1~10000 之間");
      return;
    }
    setTopUpLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/wallet/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: wallet!.studentId,
          amount,
          method: topUpMethod,
          note: topUpNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "儲值失敗");
        return;
      }
      setMessage(`儲值成功！新餘額：$${data.balanceAfter}`);
      setTopUpAmount("");
      setTopUpNote("");
      // Refresh
      searchStudent();
      fetchList();
    } catch {
      setError("網路錯誤");
    } finally {
      setTopUpLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BackButton href="/admin/hub" variant="light" />
          <h1 className="text-2xl font-bold">錢包管理</h1>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <StatTile label="錢包總數" value={String(stats.total)} />
          <StatTile label="使用中" value={String(stats.active)} tone="ok" />
          <StatTile label="已結清" value={String(stats.closed)} tone="dim" />
          <StatTile label="流通餘額" value={`$${stats.totalBalance.toLocaleString()}`} tone="highlight" />
        </div>

        {/* Search bar (list-side) */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="搜尋學號 / 姓名 / 班級"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            className="flex-1 px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={fetchList}
            disabled={listLoading}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg font-medium disabled:opacity-50 transition-colors text-sm"
            title="重新整理"
          >{listLoading ? "…" : "↻"}</button>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                filter === opt.key
                  ? "bg-amber-500 text-stone-950 border-amber-500 shadow-sm"
                  : "bg-stone-900 text-stone-400 border-stone-700 hover:bg-stone-800"
              }`}
            >{opt.label}</button>
          ))}
        </div>

        {/* Wallet list */}
        <div className="mb-6 bg-stone-900 border border-stone-700 rounded-lg overflow-hidden">
          {listLoading && wallets.length === 0 ? (
            <p className="p-4 text-sm text-stone-500">錢包列表載入中…</p>
          ) : filteredWallets.length === 0 ? (
            <p className="p-4 text-sm text-stone-500">沒有符合條件的錢包</p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-stone-800">
              {filteredWallets.map((w) => {
                const isSelected = wallet?.studentId === w.studentId;
                const isClosed = !!w.closedAt;
                const isLow = !isClosed && w.balance > 0 && w.balance < 50;
                return (
                  <button
                    key={w.studentId}
                    onClick={() => openWallet(w.studentId)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                      isSelected ? "bg-amber-950/30" : "hover:bg-stone-800/70"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-stone-100">{w.studentId}</span>
                        {w.studentName && <span className="text-stone-300">{w.studentName}</span>}
                        {w.className && <span className="text-xs text-stone-500">{w.className}</span>}
                        {isClosed && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-700 text-stone-300">已結清</span>}
                        {isLow && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">低餘額</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className={`font-mono font-bold ${isClosed ? "text-stone-500" : w.balance === 0 ? "text-stone-400" : "text-amber-400"}`}>
                        ${w.balance.toLocaleString()}
                      </div>
                      {w.walletCode && <div className="text-[10px] text-stone-500 font-mono">{w.walletCode}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Direct-lookup fallback */}
        <details className="mb-6">
          <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-400">直接輸入學號查詢（若列表未載入）</summary>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="輸入學號"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchStudent()}
              className="flex-1 px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={searchStudent}
              disabled={loading}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? "查詢中..." : "查詢"}
            </button>
          </div>
        </details>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-emerald-900/50 border border-emerald-700 rounded-lg text-emerald-300">
            {message}
          </div>
        )}

        {wallet && (
          <>
            {/* Wallet Info */}
            <div className="mb-6 p-4 bg-stone-900 border border-stone-700 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">錢包資訊</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-stone-400">學號：</span>
                  <span>{wallet.studentId}</span>
                </div>
                <div>
                  <span className="text-stone-400">錢包代碼：</span>
                  <span className="font-mono">{wallet.walletCode}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-stone-400">餘額：</span>
                  <span className="text-2xl font-bold text-amber-400">${wallet.balance}</span>
                </div>
              </div>
            </div>

            {/* Top-up Form */}
            <div className="mb-6 p-4 bg-stone-900 border border-stone-700 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">儲值</h2>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="金額"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    min={1}
                    max={10000}
                    className="flex-1 px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <select
                    value={topUpMethod}
                    onChange={(e) => setTopUpMethod(e.target.value)}
                    className="px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="cash">現金</option>
                    <option value="bank_transfer">銀行轉帳</option>
                    <option value="admin_adjustment">管理員調整</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="備註（選填）"
                  value={topUpNote}
                  onChange={(e) => setTopUpNote(e.target.value)}
                  maxLength={200}
                  className="w-full px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={handleTopUp}
                  disabled={topUpLoading || !topUpAmount}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {topUpLoading ? "處理中..." : "確認儲值"}
                </button>
              </div>
            </div>

            {/* Refund voucher (shown after close) */}
            {refund && (
              <div className="mb-6 p-4 bg-amber-950/40 border border-amber-500 rounded-lg">
                <h2 className="text-lg font-semibold mb-2 text-amber-300">退費憑證</h2>
                <p className="text-xs text-amber-200/70 mb-3">請學生持此代碼到合作社臨櫃領取現金</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-amber-200/70">退費金額</p>
                    <p className="text-2xl font-black text-amber-300">${refund.refundAmount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-amber-200/70">退費代碼</p>
                    <p className="text-2xl font-black tracking-widest text-amber-300 font-mono">{refund.refundCode}</p>
                  </div>
                </div>
                <button onClick={() => setRefund(null)} className="mt-3 text-xs text-amber-200/70 underline">關閉</button>
              </div>
            )}

            {/* Close wallet / refund  OR  Reactivate closed wallet */}
            {wallet.closedAt ? (
              <div className="mb-6 p-4 bg-stone-900 border border-emerald-800/60 rounded-lg">
                <h2 className="text-lg font-semibold mb-1 text-emerald-300">此錢包已結清</h2>
                <p className="text-xs text-stone-400 mb-3">
                  結清時間：{new Date(wallet.closedAt).toLocaleString("zh-TW")}
                  <br />若學生重新入學或誤結清，可以直接重新啟用。或直接執行儲值，系統會自動重新啟用。
                </p>
                <button
                  onClick={handleReactivate}
                  className="w-full py-2 bg-emerald-900/50 hover:bg-emerald-800/50 border border-emerald-700 rounded-lg font-medium transition-colors"
                >
                  重新啟用錢包
                </button>
              </div>
            ) : (
            <div className="mb-6 p-4 bg-stone-900 border border-red-800/60 rounded-lg">
              <h2 className="text-lg font-semibold mb-1 text-red-300">結清錢包（退費）</h2>
              <p className="text-xs text-stone-400 mb-3">學生離校 / 轉學 / 畢業時使用。錢包歸零並產生退費碼。</p>
              {!confirmClose ? (
                <button
                  onClick={() => setConfirmClose(true)}
                  disabled={wallet.balance === 0}
                  className="w-full py-2 bg-red-900/50 hover:bg-red-800/50 border border-red-700 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {wallet.balance === 0 ? "餘額為零，無需結清" : `結清並退費 $${wallet.balance}`}
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="結清原因（選填，例如：112 學年畢業）"
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                    maxLength={200}
                    className="w-full px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmClose(false)}
                      className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg font-medium transition-colors"
                    >取消</button>
                    <button
                      onClick={handleClose}
                      disabled={closeLoading}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium disabled:opacity-50 transition-colors"
                    >{closeLoading ? "處理中..." : `確認結清 $${wallet.balance}`}</button>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Transactions */}
            <div className="p-4 bg-stone-900 border border-stone-700 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">交易紀錄</h2>
                <button
                  onClick={downloadHistoryCsv}
                  className="px-3 py-1.5 text-xs bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg font-medium transition-colors flex items-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  下載 CSV
                </button>
              </div>
              {transactions.length === 0 ? (
                <p className="text-stone-500 text-sm">尚無交易紀錄</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-stone-800 rounded-lg text-sm"
                    >
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                            tx.type === "top_up"
                              ? "bg-emerald-900 text-emerald-300"
                              : tx.type === "payment"
                              ? "bg-red-900 text-red-300"
                              : "bg-blue-900 text-blue-300"
                          }`}
                        >
                          {typeLabels[tx.type] || tx.type}
                        </span>
                        <span className="text-stone-400">
                          {methodLabels[tx.method] || tx.method}
                        </span>
                        {tx.note && (
                          <span className="text-stone-500 ml-2">({tx.note})</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-mono font-bold ${
                            tx.amount > 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {tx.amount > 0 ? "+" : ""}${tx.amount}
                        </div>
                        <div className="text-xs text-stone-500">
                          餘額 ${tx.balanceAfter}
                        </div>
                        <div className="text-xs text-stone-600">
                          {new Date(tx.createdAt).toLocaleString("zh-TW")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "ok" | "dim" | "highlight" }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
      : tone === "dim"
      ? "bg-stone-900 border-stone-700 text-stone-400"
      : tone === "highlight"
      ? "bg-amber-950/40 border-amber-800 text-amber-300"
      : "bg-stone-900 border-stone-700 text-stone-200";
  return (
    <div className={`border rounded-lg px-3 py-2 ${cls}`}>
      <p className="text-[10px] opacity-70">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}
