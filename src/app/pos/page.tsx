"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMenuItems, useOrders, createOrderSecure, updateOrderStatusSecure } from "@/lib/hooks";
import type { MenuItem } from "@/types";

const statusLabels: Record<string, string> = {
  pending: "待確認", confirmed: "準備中", ready: "可取餐", picked_up: "已取餐", cancelled: "已取消",
};
const statusColors: Record<string, string> = {
  pending: "bg-amber-500", confirmed: "bg-blue-500", ready: "bg-emerald-500", picked_up: "bg-stone-400", cancelled: "bg-red-500",
};

interface CartEntry { item: MenuItem; qty: number; }

export default function POSPage() {
  const [dept, setDept] = useState<"breakfast" | "lunch">("breakfast");
  const { items: menuItems } = useMenuItems(dept);
  const { orders } = useOrders(dept);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [view, setView] = useState<"order" | "queue">("order");
  const [soundOn, setSoundOn] = useState(true);
  const prevPendingRef = useRef(0);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; gain.gain.value = 0.4;
      osc.start(); osc.stop(ctx.currentTime + 0.12);
      setTimeout(() => {
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.frequency.value = 1100; g2.gain.value = 0.4;
        o2.start(); o2.stop(ctx.currentTime + 0.15);
      }, 150);
    } catch {}
  }, []);

  useEffect(() => {
    const pending = orders.filter((o) => o.status === "pending").length;
    if (soundOn && prevPendingRef.current > 0 && pending > prevPendingRef.current) {
      playBeep();
    }
    prevPendingRef.current = pending;
  }, [orders, soundOn, playBeep]);

  useEffect(() => { setCart([]); }, [dept]);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) return prev.map((c) => (c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { item, qty: 1 }];
    });
  }

  function updateCartQty(id: string, qty: number) {
    if (qty <= 0) setCart((prev) => prev.filter((c) => c.item.id !== id));
    else setCart((prev) => prev.map((c) => (c.item.id === id ? { ...c, qty } : c)));
  }

  const cartTotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0);

  async function submitOrder() {
    if (cart.length === 0) return;
    await createOrderSecure({
      studentId: "POS",
      studentName: "現場點餐",
      className: null,
      department: dept,
      note: null,
      pickupTime: null,
      items: cart.map((c) => ({
        menuItemId: c.item.id, name: c.item.name, quantity: c.qty, price: c.item.price,
      })),
    });
    setCart([]);
  }

  const categories = [...new Set(menuItems.map((i) => i.category))];
  const activeOrders = orders.filter((o) => !["picked_up", "cancelled"].includes(o.status));
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="h-screen flex flex-col bg-stone-950 text-white overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 bg-stone-900 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-tight">POS 點餐機</h1>
          <div className="flex bg-stone-800 rounded-xl p-0.5">
            {(["breakfast", "lunch"] as const).map((d) => (
              <button key={d} onClick={() => setDept(d)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${dept === d ? "bg-white text-stone-900" : "text-stone-400 hover:text-white"}`}>
                {d === "breakfast" ? "早餐部" : "午餐部"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSoundOn(!soundOn)} className="text-sm text-stone-400 hover:text-white transition-colors">
            {soundOn ? "🔔" : "🔕"}
          </button>
          <div className="flex bg-stone-800 rounded-xl p-0.5">
            <button onClick={() => setView("order")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "order" ? "bg-white text-stone-900" : "text-stone-400 hover:text-white"}`}>
              點餐
            </button>
            <button onClick={() => setView("queue")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all relative ${view === "queue" ? "bg-white text-stone-900" : "text-stone-400 hover:text-white"}`}>
              訂單
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">{pendingCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {view === "order" ? (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            {categories.map((cat) => (
              <div key={cat} className="mb-5">
                <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">{cat}</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {menuItems.filter((i) => i.category === cat).map((item) => (
                    <button key={item.id} onClick={() => addToCart(item)}
                      className="bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl p-3 text-left transition-all active:scale-95">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-amber-400 font-bold mt-1">${item.price}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="w-80 bg-stone-900 border-l border-stone-800 flex flex-col shrink-0">
            <div className="p-4 border-b border-stone-800">
              <h2 className="font-bold text-lg">目前訂單</h2>
              <p className="text-sm text-stone-500">{cart.length} 項品項</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 && <p className="text-stone-600 text-center mt-10 text-sm">點擊菜單加入品項</p>}
              {cart.map((c) => (
                <div key={c.item.id} className="bg-stone-800 rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.item.name}</p>
                    <p className="text-xs text-stone-500">${c.item.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateCartQty(c.item.id, c.qty - 1)}
                      className="w-7 h-7 rounded-lg bg-stone-700 flex items-center justify-center text-sm hover:bg-stone-600">−</button>
                    <span className="w-5 text-center text-sm font-bold">{c.qty}</span>
                    <button onClick={() => updateCartQty(c.item.id, c.qty + 1)}
                      className="w-7 h-7 rounded-lg bg-stone-700 flex items-center justify-center text-sm hover:bg-stone-600">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-stone-800 space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span>合計</span><span className="text-amber-400">${cartTotal}</span>
              </div>
              <button onClick={submitOrder} disabled={cart.length === 0}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-700 disabled:text-stone-500 text-white rounded-xl py-3 font-bold text-lg transition-all active:scale-98">
                送出訂單
              </button>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="w-full text-stone-500 hover:text-red-400 text-sm py-1 transition-colors">清空</button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeOrders.length === 0 && <p className="text-stone-600 text-center col-span-full mt-20">目前沒有訂單</p>}
            {activeOrders.map((order) => {
              const nextMap: Record<string, string> = { pending: "confirmed", confirmed: "ready", ready: "picked_up" };
              const next = nextMap[order.status];
              return (
                <div key={order.id}
                  className={`bg-stone-900 border rounded-xl p-4 ${
                    order.status === "pending" ? "border-amber-500/50 shadow-lg shadow-amber-500/10"
                    : order.status === "ready" ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                    : "border-stone-800"
                  }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-black">#{order.orderNumber}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                  </div>
                  <div className="text-sm text-stone-400 space-y-0.5 mb-3">
                    <p>{order.className} {order.studentId} {order.studentName}</p>
                    {order.pickupTime && <p>取餐：{order.pickupTime}</p>}
                    {order.note && <p className="text-amber-400">備註：{order.note}</p>}
                  </div>
                  <div className="text-sm space-y-0.5 mb-3">
                    {order.items.map((item, i) => (<p key={i} className="text-stone-300">{item.name} × {item.quantity}</p>))}
                    <p className="font-bold text-amber-400 mt-1">${order.totalPrice}</p>
                  </div>
                  <div className="flex gap-2">
                    {next && (
                      <button onClick={() => updateOrderStatusSecure(order.id, next)}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                          order.status === "pending" ? "bg-blue-500 hover:bg-blue-600"
                          : order.status === "confirmed" ? "bg-emerald-500 hover:bg-emerald-600"
                          : "bg-stone-600 hover:bg-stone-500"
                        } text-white`}>
                        → {statusLabels[next]}
                      </button>
                    )}
                    {order.status !== "cancelled" && (
                      <button onClick={() => updateOrderStatusSecure(order.id, "cancelled")}
                        className="px-4 py-2 rounded-xl text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all">取消</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
