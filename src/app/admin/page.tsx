"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useOrders, updateOrderStatusSecure } from "@/lib/hooks";
import { BackButton } from "@/components/BackButton";

const statusFlow = ["pending", "confirmed", "ready", "picked_up"];
const statusLabels: Record<string, string> = {
  pending: "待確認",
  confirmed: "準備中",
  ready: "可取餐",
  picked_up: "已取餐",
  cancelled: "已取消",
};
const statusColors: Record<string, string> = {
  pending: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  confirmed: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  ready: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  picked_up: "bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700",
  cancelled: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
};

interface AppConfig {
  requireLocation: boolean;
  requireSchoolEmail: boolean;
}

export default function AdminPage() {
  const [dept, setDept] = useState<string>("breakfast");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevCountRef = useRef<number>(0);
  const [appConfig, setAppConfig] = useState<AppConfig>({ requireLocation: true, requireSchoolEmail: true });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configToast, setConfigToast] = useState("");

  const { orders } = useOrders(dept, filterStatus);

  const playNotification = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.2);
      }, 180);
    } catch {}
  }, [soundEnabled]);

  useEffect(() => {
    const pendingCount = orders.filter((o) => o.status === "pending").length;
    if (prevCountRef.current > 0 && pendingCount > prevCountRef.current) {
      playNotification();
    }
    prevCountRef.current = pendingCount;
  }, [orders, playNotification]);

  useEffect(() => {
    fetch("/api/settings/app-config").then(r => r.json()).then(d => {
      setAppConfig(d);
      setConfigLoaded(true);
    }).catch(() => setConfigLoaded(true));
  }, []);

  async function toggleConfig(key: keyof AppConfig, label: string) {
    const updated = { ...appConfig, [key]: !appConfig[key] };
    setAppConfig(updated);
    try {
      const res = await fetch("/api/settings/app-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setConfigToast(`${label}：${updated[key] ? "已開啟" : "已關閉"}`);
      } else {
        setAppConfig(appConfig);
        setConfigToast("儲存失敗，請重試");
      }
    } catch {
      setAppConfig(appConfig);
      setConfigToast("網路錯誤");
    }
    setTimeout(() => setConfigToast(""), 2500);
  }

  function nextStatus(current: string) {
    const idx = statusFlow.indexOf(current);
    return idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  }

  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString()
  );
  const todayRevenue = todayOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.totalPrice, 0);

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-stone-900 text-white px-5 py-4 flex items-center gap-4">
        <BackButton href="/admin/hub" variant="light" />
        <h1 className="text-lg font-bold tracking-tight">管理面板</h1>
        <div className="ml-auto flex items-center gap-2 overflow-x-auto scrollbar-none flex-shrink min-w-0">
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-sm bg-stone-800 hover:bg-stone-700 px-3 py-2 rounded-xl transition-colors flex-shrink-0">
            {soundEnabled ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            )}
          </button>
          <Link href="/pos" className="text-sm bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-xl font-semibold transition-colors flex-shrink-0 whitespace-nowrap">POS</Link>
          <Link href="/admin/menu" className="text-sm bg-stone-800 hover:bg-stone-700 px-3 py-2 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap">菜單</Link>
          <Link href="/admin/students" className="text-sm bg-stone-800 hover:bg-stone-700 px-3 py-2 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap">名冊</Link>
          <Link href="/admin/pickup-slots" className="text-sm bg-stone-800 hover:bg-stone-700 px-3 py-2 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap">時段</Link>
          <Link href="/admin/analytics" className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-xl font-semibold transition-colors flex-shrink-0 whitespace-nowrap">分析</Link>
          <Link href="/admin/wallet" className="text-sm bg-amber-600 hover:bg-amber-500 px-3 py-2 rounded-xl font-semibold transition-colors flex-shrink-0 whitespace-nowrap">錢包</Link>
          <button onClick={async () => { await fetch("/api/auth", { method: "DELETE" }); window.location.href = "/admin/login"; }}
            className="text-sm bg-stone-800 hover:bg-stone-700 px-3 py-2 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap">登出</button>
        </div>
      </header>

      <div className="flex gap-2 px-5 py-4 border-b border-stone-100 dark:border-stone-800">
        {["breakfast", "lunch"].map((d) => (
          <button key={d} onClick={() => setDept(d)}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${dept === d ? "border-[#E23D28] bg-red-50 dark:bg-red-950/30 text-[#E23D28] shadow-sm" : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600"}`}>
            {dept === d && (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
            {d === "breakfast" ? "早餐部" : "午餐部"}
          </button>
        ))}
      </div>

      <div className="px-5 py-4 flex gap-3">
        <div className="flex-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3">
          <p className="text-label text-blue-500 dark:text-blue-400">今日訂單</p>
          <p className="text-value text-2xl text-blue-700 dark:text-blue-300 mt-0.5">{todayOrders.length}</p>
        </div>
        <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 rounded-xl px-4 py-3">
          <p className="text-label text-emerald-500 dark:text-emerald-400">營業額</p>
          <p className="text-value text-2xl text-emerald-700 dark:text-emerald-300 mt-0.5">${todayRevenue}</p>
        </div>
      </div>

      <div className="flex gap-2 px-5 py-2 overflow-x-auto scrollbar-none">
        {["all", ...statusFlow, "cancelled"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs whitespace-nowrap font-medium transition-all border-2 ${filterStatus === s ? "border-[#E23D28] bg-red-50 dark:bg-red-950/30 text-[#E23D28]" : "border-transparent bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"}`}>
            {filterStatus === s && (
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
            {s === "all" ? "全部" : statusLabels[s]}
          </button>
        ))}
      </div>

      <main className="flex-1 px-5 py-4 space-y-3 pb-8">
        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 dark:text-stone-600">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <p className="font-semibold text-stone-700 dark:text-stone-300 mb-1">目前沒有訂單</p>
            <p className="text-sm text-stone-400 dark:text-stone-500 text-center">新訂單進來時會自動顯示並發出提示音</p>
          </div>
        )}
        {orders.map((order) => {
          const next = nextStatus(order.status);
          return (
            <div key={order.id} className="card-premium p-5 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-value text-2xl">#{order.orderNumber}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                </div>
                <span className="text-dim text-xs">
                  {new Date(order.createdAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-sub text-sm space-y-0.5">
                <p className="font-medium">{order.className} {order.studentId} {order.studentName}</p>
                {order.pickupTime && <p className="text-dim">取餐：{order.pickupTime}</p>}
                {order.note && <p className="text-orange-600 dark:text-orange-400 font-medium">備註：{order.note}</p>}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-dim text-xs">{order.items.map((item, i) => (<span key={i} className="mr-2">{item.name}x{item.quantity}</span>))}</span>
                <span className="text-value text-lg ml-auto">${order.totalPrice}</span>
              </div>
              <div className="mt-4 flex gap-2">
                {next && (
                  <button onClick={() => updateOrderStatusSecure(order.id, next)}
                    className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all active:scale-95">
                    → {statusLabels[next]}
                  </button>
                )}
                {order.status !== "cancelled" && order.status !== "picked_up" && (
                  <button onClick={() => updateOrderStatusSecure(order.id, "cancelled")}
                    className="px-5 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl text-sm font-medium transition-colors">取消</button>
                )}
              </div>
            </div>
          );
        })}
        {/* App Config Toggles */}
        {configLoaded && (
          <div className="mt-6 pt-6 border-t border-stone-200 dark:border-stone-700 space-y-3">
            <h2 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">系統開關</h2>
            {([
              { key: "requireLocation" as const, label: "下單定位驗證", desc: "要求學生在校園範圍內才能下單" },
              { key: "requireSchoolEmail" as const, label: "學校 Email 驗證", desc: "註冊時限制 @nhsh.tp.edu.tw 網域" },
            ]).map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{item.label}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => toggleConfig(item.key, item.label)}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                    appConfig[item.key] ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-600"
                  }`}
                >
                  <div className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200" style={{ transform: appConfig[item.key] ? "translateX(22px)" : "translateX(2px)" }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Config toast */}
      {configToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-stone-900 text-white text-sm font-semibold rounded-xl shadow-xl animate-fade-in">
          {configToast}
        </div>
      )}
    </div>
  );
}
