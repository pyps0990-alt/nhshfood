"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";

interface AnalyticsData {
  overview: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    avgOrderPrice: number;
    uniqueStudents: number;
    completionRate: number;
    cancelRate: number;
  };
  dailyTrend: { date: string; revenue: number; orders: number }[];
  hourly: number[];
  topItems: { name: string; qty: number; revenue: number }[];
  classRanking: { className: string; orders: number; revenue: number }[];
  statusBreakdown: Record<string, number>;
  deptSplit: Record<string, { orders: number; revenue: number }>;
  prepTimeStats: {
    sampleSize: number;
    confirmTime: { avg: number | null; median: number | null; p90: number | null; count: number };
    cookTime: { avg: number | null; median: number | null; p90: number | null; count: number };
    totalPrepTime: { avg: number | null; median: number | null; p90: number | null; count: number };
    byHour: Record<string, { avg: number | null; count: number }>;
    distribution: { label: string; count: number }[];
  };
  range: string;
}

const rangeOptions = [
  { key: "1d", label: "今日" },
  { key: "7d", label: "7 天" },
  { key: "30d", label: "30 天" },
  { key: "90d", label: "90 天" },
];

const deptOptions = [
  { key: "all", label: "全部" },
  { key: "breakfast", label: "早餐部" },
  { key: "lunch", label: "午餐部" },
];

const statusLabels: Record<string, string> = {
  pending: "待確認",
  confirmed: "準備中",
  ready: "可取餐",
  picked_up: "已取餐",
  cancelled: "已取消",
};

const statusColors: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  ready: "#10b981",
  picked_up: "#6b7280",
  cancelled: "#ef4444",
};

interface ReconcileSummary {
  date: string;
  totalOrders: number;
  cancelledOrders: number;
  walletOrdersTotal: number;
  walletPaymentsDebited: number;
  walletDiff: number;
  anomaly: boolean;
  cashOrdersTotal: number;
  walletTopUps: number;
  walletRefunds: number;
  grandTotal: number;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState("7d");
  const [dept, setDept] = useState("all");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recDate, setRecDate] = useState(todayStr());
  const [recSummary, setRecSummary] = useState<ReconcileSummary | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState("");

  const fetchReconcile = useCallback(async () => {
    setRecLoading(true);
    setRecError("");
    try {
      const res = await fetch(`/api/analytics/reconcile?date=${recDate}`);
      if (!res.ok) throw new Error("載入失敗");
      const body = await res.json();
      setRecSummary(body.summary);
    } catch {
      setRecError("對帳資料載入失敗");
      setRecSummary(null);
    } finally {
      setRecLoading(false);
    }
  }, [recDate]);

  useEffect(() => { fetchReconcile(); }, [fetchReconcile]);

  function downloadReconcileCsv() {
    window.location.href = `/api/analytics/reconcile?date=${recDate}&format=csv`;
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/analytics?range=${range}&dept=${dept}`);
      if (!res.ok) throw new Error("載入失敗");
      setData(await res.json());
    } catch {
      setError("分析資料載入失敗");
    } finally {
      setLoading(false);
    }
  }, [range, dept]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="flex-1 flex flex-col bg-stone-50 dark:bg-stone-950">
      <header className="bg-stone-900 text-white px-5 py-4 flex items-center gap-4">
        <BackButton href="/admin/hub" variant="light" />
        <h1 className="text-lg font-bold tracking-tight">數據分析</h1>
        <Link href="/admin" className="ml-auto text-sm bg-stone-800 hover:bg-stone-700 px-3 py-2 rounded-xl transition-colors">
          訂單管理
        </Link>
      </header>

      {/* Daily reconciliation panel */}
      <section className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              每日對帳
              {recSummary && recSummary.anomaly && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">異常</span>
              )}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">錢包扣款訂單額 vs 錢包實際扣款額 三方勾稽</p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={recDate}
              max={todayStr()}
              onChange={(e) => setRecDate(e.target.value)}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30"
            />
            <button
              onClick={downloadReconcileCsv}
              className="px-4 py-2 rounded-xl bg-[#E23D28] hover:bg-[#c9321f] text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              下載 CSV
            </button>
          </div>
        </div>

        {recLoading && (
          <p className="text-xs text-stone-400">對帳資料載入中…</p>
        )}
        {recError && !recLoading && (
          <p className="text-xs text-red-500">{recError}</p>
        )}
        {recSummary && !recLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ReconcileTile label="有效訂單筆數" value={String(recSummary.totalOrders)} />
            <ReconcileTile label="錢包訂單額 (A)" value={`$${recSummary.walletOrdersTotal.toLocaleString()}`} />
            <ReconcileTile label="錢包實扣額 (B)" value={`$${recSummary.walletPaymentsDebited.toLocaleString()}`} />
            <ReconcileTile
              label="勾稽差額 A−B"
              value={`${recSummary.walletDiff > 0 ? "+" : ""}${recSummary.walletDiff}`}
              tone={recSummary.anomaly ? "danger" : "ok"}
            />
            <ReconcileTile label="現金訂單額" value={`$${recSummary.cashOrdersTotal.toLocaleString()}`} />
            <ReconcileTile label="當日儲值" value={`$${recSummary.walletTopUps.toLocaleString()}`} />
            <ReconcileTile label="當日退費" value={`$${recSummary.walletRefunds.toLocaleString()}`} />
            <ReconcileTile label="熱食部應收" value={`$${recSummary.grandTotal.toLocaleString()}`} tone="highlight" />
          </div>
        )}
      </section>

      {/* Filters */}
      <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
        <div className="flex gap-2">
          {rangeOptions.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                range === r.key
                  ? "bg-[#E23D28] text-white border-[#E23D28] shadow-sm"
                  : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 bg-white dark:bg-stone-900"
              }`}
            >{r.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {deptOptions.map((d) => (
            <button key={d.key} onClick={() => setDept(d.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                dept === d.key
                  ? "bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-stone-800 dark:border-stone-200"
                  : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 bg-white dark:bg-stone-900"
              }`}
            >{d.label}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-stone-200 dark:border-stone-700 border-t-[#E23D28] rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="px-5 py-8 text-center">
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={fetchData} className="mt-3 text-sm text-[#E23D28] font-semibold">重試</button>
        </div>
      )}

      {data && !loading && (
        <main className="flex-1 px-5 py-5 space-y-5 pb-10 overflow-y-auto">

          {/* Overview Cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="總營收" value={`$${data.overview.totalRevenue.toLocaleString()}`} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800" />
            <StatCard label="訂單數" value={String(data.overview.totalOrders)} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800" />
            <StatCard label="客單價" value={`$${data.overview.avgOrderPrice}`} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-800" />
            <StatCard label="不重複顧客" value={String(data.overview.uniqueStudents)} color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-800" />
          </div>

          {/* Completion / Cancel rate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">完成率</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{data.overview.completionRate}%</span>
                <span className="text-xs text-stone-400 mb-1">{data.overview.completedOrders} 筆</span>
              </div>
              <div className="mt-2 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${data.overview.completionRate}%` }} />
              </div>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">取消率</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-red-500">{data.overview.cancelRate}%</span>
                <span className="text-xs text-stone-400 mb-1">{data.overview.cancelledOrders} 筆</span>
              </div>
              <div className="mt-2 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${data.overview.cancelRate}%` }} />
              </div>
            </div>
          </div>

          {/* Department Split */}
          {dept === "all" && Object.keys(data.deptSplit).length > 0 && (
            <Section title="部門對比">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(data.deptSplit).map(([d, v]) => (
                  <div key={d} className={`rounded-2xl p-4 border ${d === "breakfast" ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900" : "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900"}`}>
                    <p className={`text-sm font-bold ${d === "breakfast" ? "text-[#E23D28]" : "text-[#FF6B35]"}`}>
                      {d === "breakfast" ? "早餐部" : "午餐部"}
                    </p>
                    <p className="text-xl font-black text-stone-800 dark:text-stone-200 mt-1">${v.revenue.toLocaleString()}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{v.orders} 筆訂單</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Revenue Trend Chart */}
          {data.dailyTrend.length > 0 && (
            <Section title="營收趨勢">
              <BarChart
                data={data.dailyTrend.map(d => ({
                  label: d.date.slice(5),
                  value: d.revenue,
                  sub: `${d.orders}筆`,
                }))}
                color="#10b981"
                prefix="$"
              />
            </Section>
          )}

          {/* Hourly Distribution */}
          <Section title="尖峰時段分布">
            <HourlyChart data={data.hourly} />
          </Section>

          {/* Prep Time Analysis */}
          {data.prepTimeStats.sampleSize > 0 && (
            <Section title="訂單準備時間分析">
              <PrepTimeSection stats={data.prepTimeStats} />
            </Section>
          )}

          {/* Top Items */}
          {data.topItems.length > 0 && (
            <Section title="熱門品項 TOP 10">
              <div className="space-y-2">
                {data.topItems.map((item, i) => {
                  const maxQty = data.topItems[0].qty;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i < 3 ? "bg-[#E23D28] text-white" : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400"
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">{item.name}</span>
                          <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0 ml-2">{item.qty} 份 / ${item.revenue}</span>
                        </div>
                        <div className="h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(item.qty / maxQty) * 100}%`,
                              background: i < 3 ? "linear-gradient(90deg, #E23D28, #FF6B35)" : "#a8a29e",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Class Ranking */}
          {data.classRanking.length > 0 && (
            <Section title="班級訂購排行">
              <div className="space-y-2">
                {data.classRanking.map((cls, i) => {
                  const maxOrders = data.classRanking[0].orders;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i < 3 ? "bg-blue-500 text-white" : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400"
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">{cls.className}</span>
                          <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0 ml-2">{cls.orders} 筆 / ${cls.revenue}</span>
                        </div>
                        <div className="h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${(cls.orders / maxOrders) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Status Breakdown */}
          {Object.keys(data.statusBreakdown).length > 0 && (
            <Section title="訂單狀態分布">
              <div className="flex gap-2 flex-wrap">
                {Object.entries(data.statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors[status] || "#6b7280" }} />
                    <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{statusLabels[status] || status}</span>
                    <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{count}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </main>
      )}
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`border rounded-2xl px-4 py-3 ${bg}`}>
      <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
      <p className={`text-2xl font-black mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function ReconcileTile({ label, value, tone }: { label: string; value: string; tone?: "ok" | "danger" | "highlight" }) {
  const cls =
    tone === "danger"
      ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
      : tone === "highlight"
      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
      : tone === "ok"
      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
      : "bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200";
  return (
    <div className={`border rounded-xl px-3 py-2 ${cls}`}>
      <p className="text-[10px] font-medium opacity-70">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-4 flex items-center gap-2">
        <div className="w-1 h-4 bg-[#E23D28] rounded-full" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function BarChart({ data, color, prefix = "" }: { data: { label: string; value: number; sub?: string }[]; color: string; prefix?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-stone-500 dark:text-stone-400 w-12 text-right shrink-0 font-mono">{d.label}</span>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-6 bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all flex items-center justify-end pr-2"
                style={{ width: `${Math.max((d.value / max) * 100, 2)}%`, backgroundColor: color }}
              >
                {d.value > 0 && (d.value / max) > 0.2 && (
                  <span className="text-[10px] font-bold text-white">{prefix}{d.value.toLocaleString()}</span>
                )}
              </div>
            </div>
            {(d.value / max) <= 0.2 && (
              <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">{prefix}{d.value.toLocaleString()}</span>
            )}
          </div>
          {d.sub && <span className="text-[10px] text-stone-400 shrink-0 w-8">{d.sub}</span>}
        </div>
      ))}
    </div>
  );
}

function HourlyChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const relevantHours = data.map((v, i) => ({ hour: i, count: v })).filter(h => h.hour >= 6 && h.hour <= 18);
  const peakHour = relevantHours.reduce((a, b) => b.count > a.count ? b : a, { hour: 0, count: 0 });

  return (
    <div>
      {peakHour.count > 0 && (
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
          尖峰時段：<span className="font-bold text-[#E23D28]">{peakHour.hour}:00</span>（{peakHour.count} 筆）
        </p>
      )}
      <div className="flex items-end gap-[3px] h-28">
        {relevantHours.map((h) => (
          <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col items-center justify-end" style={{ height: "80px" }}>
              {h.count > 0 && (
                <span className="text-[9px] font-bold text-stone-500 dark:text-stone-400 mb-0.5">{h.count}</span>
              )}
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${Math.max((h.count / max) * 70, h.count > 0 ? 4 : 1)}px`,
                  backgroundColor: h.hour === peakHour.hour ? "#E23D28" : h.count > 0 ? "#FF6B35" : "#e7e5e4",
                  opacity: h.count === 0 ? 0.3 : 1,
                }}
              />
            </div>
            <span className="text-[9px] text-stone-400 dark:text-stone-500 font-mono">{h.hour}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrepTimeSection({ stats }: { stats: AnalyticsData["prepTimeStats"] }) {
  const fmt = (v: number | null) => v !== null ? `${v} 分` : "--";
  const maxDist = Math.max(...stats.distribution.map(d => d.count), 1);

  const hourEntries = Object.entries(stats.byHour)
    .map(([h, v]) => ({ hour: parseInt(h), ...v }))
    .filter(h => h.hour >= 6 && h.hour <= 18 && h.count > 0)
    .sort((a, b) => a.hour - b.hour);
  const slowestHour = hourEntries.length > 0 ? hourEntries.reduce((a, b) => (b.avg || 0) > (a.avg || 0) ? b : a) : null;
  const fastestHour = hourEntries.length > 0 ? hourEntries.reduce((a, b) => (b.avg || 99) < (a.avg || 99) ? b : a) : null;

  return (
    <div className="space-y-5">
      <p className="text-xs text-stone-400 dark:text-stone-500">
        基於 {stats.sampleSize} 筆有完整時間戳的訂單
      </p>

      {/* Three phase cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-xl p-3 text-center">
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mb-1">接單</p>
          <p className="text-lg font-black text-amber-700 dark:text-amber-300">{fmt(stats.confirmTime.median)}</p>
          <p className="text-[10px] text-stone-400 mt-0.5">中位數</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl p-3 text-center">
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mb-1">備餐</p>
          <p className="text-lg font-black text-blue-700 dark:text-blue-300">{fmt(stats.cookTime.median)}</p>
          <p className="text-[10px] text-stone-400 mt-0.5">中位數</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl p-3 text-center">
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-1">總準備</p>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{fmt(stats.totalPrepTime.median)}</p>
          <p className="text-[10px] text-stone-400 mt-0.5">中位數</p>
        </div>
      </div>

      {/* Detail stats table */}
      <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden text-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 text-xs">
              <th className="text-left px-3 py-2 font-medium">階段</th>
              <th className="text-right px-3 py-2 font-medium">平均</th>
              <th className="text-right px-3 py-2 font-medium">中位數</th>
              <th className="text-right px-3 py-2 font-medium">P90</th>
            </tr>
          </thead>
          <tbody className="text-stone-800 dark:text-stone-200">
            <tr className="border-t border-stone-100 dark:border-stone-800">
              <td className="px-3 py-2 font-medium">下單 → 確認</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(stats.confirmTime.avg)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(stats.confirmTime.median)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(stats.confirmTime.p90)}</td>
            </tr>
            <tr className="border-t border-stone-100 dark:border-stone-800">
              <td className="px-3 py-2 font-medium">確認 → 備好</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(stats.cookTime.avg)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(stats.cookTime.median)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(stats.cookTime.p90)}</td>
            </tr>
            <tr className="border-t border-stone-100 dark:border-stone-800 font-semibold">
              <td className="px-3 py-2">下單 → 備好</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(stats.totalPrepTime.avg)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(stats.totalPrepTime.median)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(stats.totalPrepTime.p90)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Distribution histogram */}
      <div>
        <p className="text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">準備時間分布（分鐘）</p>
        <div className="flex items-end gap-1 h-20">
          {stats.distribution.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              {d.count > 0 && (
                <span className="text-[9px] font-bold text-stone-500 dark:text-stone-400">{d.count}</span>
              )}
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.max((d.count / maxDist) * 56, d.count > 0 ? 4 : 1)}px`,
                  backgroundColor: d.count > 0
                    ? i <= 2 ? "#10b981" : i <= 4 ? "#f59e0b" : "#ef4444"
                    : "#e7e5e4",
                  opacity: d.count === 0 ? 0.3 : 1,
                }}
              />
              <span className="text-[8px] text-stone-400 dark:text-stone-500 whitespace-nowrap">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-emerald-500">快</span>
          <span className="text-[9px] text-red-500">慢</span>
        </div>
      </div>

      {/* Peak hour insight */}
      {slowestHour && fastestHour && slowestHour.hour !== fastestHour.hour && (
        <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3 space-y-1.5">
          <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">各時段平均準備時間</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-stone-600 dark:text-stone-300">
                最快 <span className="font-bold">{fastestHour.hour}:00</span>（{fmt(fastestHour.avg)}）
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-stone-600 dark:text-stone-300">
                最慢 <span className="font-bold">{slowestHour.hour}:00</span>（{fmt(slowestHour.avg)}）
              </span>
            </div>
          </div>
          {hourEntries.length > 0 && (
            <div className="flex items-end gap-[2px] h-10 mt-2">
              {hourEntries.map((h) => {
                const maxAvg = Math.max(...hourEntries.map(e => e.avg || 0), 1);
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full rounded-t-sm"
                      style={{
                        height: `${Math.max(((h.avg || 0) / maxAvg) * 32, 2)}px`,
                        backgroundColor: h.hour === slowestHour.hour ? "#ef4444" : h.hour === fastestHour.hour ? "#10b981" : "#FF6B35",
                      }}
                    />
                    <span className="text-[7px] text-stone-400 mt-0.5">{h.hour}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
