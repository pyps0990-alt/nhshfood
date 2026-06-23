"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useMenuItems, useOrders, createOrderSecure, updateOrderStatusSecure } from "@/lib/hooks";
import type { MenuItem } from "@/types";

const statusLabels: Record<string, string> = {
  pending: "待確認", confirmed: "準備中", ready: "可取餐", picked_up: "已取餐", cancelled: "已取消",
};
const statusColors: Record<string, string> = {
  pending: "bg-amber-500", confirmed: "bg-blue-500", ready: "bg-emerald-500", picked_up: "bg-stone-400", cancelled: "bg-red-500",
};

interface CartEntry { item: MenuItem; qty: number; }
interface OrderNotification { id: string; orderNumber: string; itemCount: number; timestamp: number; }

export default function POSPage() {
  const [dept, setDept] = useState<"breakfast" | "lunch">("breakfast");
  const { items: menuItems } = useMenuItems(dept);
  const { orders } = useOrders(dept);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [view, setView] = useState<"order" | "queue">("order");
  const [soundOn, setSoundOn] = useState(true);
  const prevPendingRef = useRef(0);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const playTone = (freq: number, delay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; gain.gain.value = 0.6;
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
      };
      playTone(880, 0, 0.12);
      playTone(1100, 0.18, 0.12);
      playTone(1320, 0.36, 0.18);
    } catch {}
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const pending = orders.filter((o) => o.status === "pending");
    const pendingCount = pending.length;
    const currentIds = new Set(pending.map((o) => o.id));

    if (prevPendingRef.current > 0 && pendingCount > prevPendingRef.current) {
      // Find new orders
      const newOrders = pending.filter((o) => !prevOrderIdsRef.current.has(o.id));
      if (newOrders.length > 0) {
        if (soundOn) playBeep();
        const newNotifs: OrderNotification[] = newOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          itemCount: o.items.length,
          timestamp: Date.now(),
        }));
        setNotifications((prev) => [...prev, ...newNotifs]);
      }
    }
    prevPendingRef.current = pendingCount;
    prevOrderIdsRef.current = currentIds;
  }, [orders, soundOn, playBeep]);

  // Auto-dismiss notifications after 8 seconds
  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setNotifications((prev) => prev.filter((n) => now - n.timestamp < 8000));
    }, 1000);
    return () => clearInterval(timer);
  }, [notifications.length]);

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
      pickupDate: null,
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
      {/* Notification popups */}
      <div className="fixed top-4 right-4 z-50 space-y-2" style={{ maxWidth: 360 }}>
        {notifications.map((n) => (
          <div key={n.id}
            className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl p-4 shadow-2xl shadow-red-500/30 flex items-center gap-3 animate-slide-in-right"
            style={{ animation: "slideInRight 0.3s ease-out" }}
          >
            <div className="flex-1">
              <p className="font-black text-xl">新訂單 #{n.orderNumber}</p>
              <p className="text-sm text-white/80">{n.itemCount} 項品項</p>
            </div>
            <button onClick={() => dismissNotification(n.id)} className="text-white/70 hover:text-white text-xl font-bold px-2">
              ✕
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <header className="flex items-center justify-between px-5 py-3 bg-stone-900 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-stone-400 hover:text-white transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <h1 className="text-lg font-bold tracking-tight">POS 點餐機</h1>
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse">
              {pendingCount} 筆待處理
            </span>
          )}
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
          <Link href="/receiver" className="text-sm text-stone-400 hover:text-white transition-colors px-3 py-1.5 bg-stone-800 rounded-lg">
            接單螢幕
          </Link>
          <button onClick={() => setSoundOn(!soundOn)} className="text-stone-400 hover:text-white transition-colors p-1.5">
            {soundOn ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            )}
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
