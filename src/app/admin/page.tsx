"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useOrders, updateOrderStatusSecure } from "@/lib/hooks";

const statusFlow = ["pending", "confirmed", "ready", "picked_up"];
const statusLabels: Record<string, string> = {
  pending: "待確認",
  confirmed: "準備中",
  ready: "可取餐",
  picked_up: "已取餐",
  cancelled: "已取消",
};
const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  picked_up: "bg-stone-50 text-stone-500 border-stone-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export default function AdminPage() {
  const [dept, setDept] = useState<string>("breakfast");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevCountRef = useRef<number>(0);

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

  function nextStatus(current: string) {
    const idx = statusFlow.indexOf(current);
    return idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  }

  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString()
  );
  const todayRevenue = todayOrders.reduce((s, o) => s + o.totalPrice, 0);

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-stone-900 text-white px-5 py-4 flex items-center gap-4">
        <Link href="/" className="text-xl hover:opacity-80 transition-opacity">←</Link>
        <h1 className="text-lg font-bold tracking-tight">管理面板</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-sm bg-stone-800 hover:bg-stone-700 px-3 py-2 rounded-xl transition-colors">
            {soundEnabled ? "🔔" : "🔕"}
          </button>
          <Link href="/pos" className="text-sm bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl font-semibold transition-colors">POS</Link>
          <Link href="/admin/menu" className="text-sm bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded-xl transition-colors">菜單</Link>
          <button onClick={async () => { await fetch("/api/auth", { method: "DELETE" }); window.location.href = "/admin/login"; }}
            className="text-sm bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded-xl transition-colors">登出</button>
        </div>
      </header>

      <div className="flex gap-2 px-5 py-4 border-b border-stone-100">
        {["breakfast", "lunch"].map((d) => (
          <button key={d} onClick={() => setDept(d)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${dept === d ? "bg-stone-900 text-white shadow-md" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
            {d === "breakfast" ? "早餐部" : "午餐部"}
          </button>
        ))}
      </div>

      <div className="px-5 py-4 flex gap-4 text-sm">
        <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-semibold border border-blue-100">今日 {todayOrders.length} 筆</span>
        <span className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-semibold border border-emerald-100">營業額 ${todayRevenue}</span>
      </div>

      <div className="flex gap-2 px-5 py-2 overflow-x-auto">
        {["all", ...statusFlow, "cancelled"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-xl text-xs whitespace-nowrap font-medium transition-all ${filterStatus === s ? "bg-stone-900 text-white shadow-md" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
            {s === "all" ? "全部" : statusLabels[s]}
          </button>
        ))}
      </div>

      <main className="flex-1 px-5 py-4 space-y-3 pb-8">
        {orders.length === 0 && <p className="text-center text-stone-400 mt-10">沒有訂單</p>}
        {orders.map((order) => {
          const next = nextStatus(order.status);
          return (
            <div key={order.id} className="card-premium p-5 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-black text-xl text-stone-900">#{order.orderNumber}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                </div>
                <span className="text-sm text-stone-400">
                  {new Date(order.createdAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-sm text-stone-600 space-y-0.5">
                <p className="font-medium">{order.className} {order.studentId} {order.studentName}</p>
                {order.pickupTime && <p>取餐：{order.pickupTime}</p>}
                {order.note && <p className="text-orange-600 font-medium">備註：{order.note}</p>}
              </div>
              <div className="mt-3 text-sm text-stone-700">
                {order.items.map((item, i) => (<span key={i} className="mr-3">{item.name}×{item.quantity}</span>))}
                <span className="font-bold ml-1 text-stone-900">${order.totalPrice}</span>
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
                    className="px-5 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-medium transition-colors">取消</button>
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
