"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useOrders, updateOrderStatusSecure } from "@/lib/hooks";

const statusLabels: Record<string, string> = {
  pending: "待確認", confirmed: "準備中", ready: "可取餐", picked_up: "已取餐", cancelled: "已取消",
};
const statusColors: Record<string, string> = {
  pending: "bg-amber-500", confirmed: "bg-blue-500", ready: "bg-emerald-500", picked_up: "bg-stone-400", cancelled: "bg-red-500",
};

interface NewOrderNotif {
  id: string;
  orderNumber: string;
  className: string | null;
  studentId: string;
  itemCount: number;
  totalPrice: number;
  timestamp: number;
}

export default function ReceiverPage() {
  const [dept, setDept] = useState<"breakfast" | "lunch">("breakfast");
  const { orders } = useOrders(dept);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const initRef = useRef(false);

  // Sound: plays exactly 2 times total across the session, then permanently off
  const soundPlayCountRef = useRef(0);
  const MAX_SOUND_PLAYS = 2;

  // Notification popup queue
  const [notifications, setNotifications] = useState<NewOrderNotif[]>([]);

  const playAlert = useCallback(() => {
    if (soundPlayCountRef.current >= MAX_SOUND_PLAYS) return;
    soundPlayCountRef.current += 1;

    try {
      const ctx = new AudioContext();
      const playTone = (freq: number, delay: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.7;
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + dur);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur + 0.05);
      };
      // Double beep pattern
      playTone(880, 0, 0.12);
      playTone(1100, 0.15, 0.12);
      playTone(880, 0.5, 0.12);
      playTone(1100, 0.65, 0.12);
    } catch {}
  }, []);

  const dismissNotif = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Show pending, confirmed, AND ready orders — don't hide after marking ready
  const activeOrders = orders.filter((o) => ["pending", "confirmed", "ready"].includes(o.status));

  useEffect(() => {
    const currentIds = new Set(activeOrders.map((o) => o.id));

    if (!initRef.current) {
      initRef.current = true;
      prevIdsRef.current = currentIds;
      return;
    }

    const newOrders = activeOrders.filter(
      (o) => o.status === "pending" && !prevIdsRef.current.has(o.id)
    );

    if (newOrders.length > 0) {
      playAlert();

      const newNotifs: NewOrderNotif[] = newOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        className: o.className || null,
        studentId: o.studentId,
        itemCount: o.items.length,
        totalPrice: o.totalPrice,
        timestamp: Date.now(),
      }));
      setNotifications((prev) => [...newNotifs, ...prev].slice(0, 5));

      newOrders.forEach((o) => {
        setTimeout(() => dismissNotif(o.id), 8000);
      });
    }

    prevIdsRef.current = currentIds;
  }, [activeOrders, playAlert, dismissNotif]);

  const pendingCount = activeOrders.filter((o) => o.status === "pending").length;
  const confirmedCount = activeOrders.filter((o) => o.status === "confirmed").length;
  const readyCount = activeOrders.filter((o) => o.status === "ready").length;

  return (
    <div className="h-screen flex flex-col bg-stone-950 text-white overflow-hidden">
      {/* Notification popups — top right */}
      {notifications.length > 0 && (
        <div className="fixed top-16 right-4 z-50 flex flex-col gap-3 max-w-sm w-full">
          {notifications.map((n, idx) => (
            <div
              key={n.id}
              className="bg-amber-500 text-stone-900 rounded-2xl p-4 shadow-2xl shadow-amber-500/30 animate-slide-in-right flex items-start gap-3"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">新訂單！</p>
                <p className="text-lg font-black">#{n.orderNumber.slice(-4)}</p>
                <p className="text-xs opacity-80 mt-0.5">
                  {n.className && `${n.className} `}{n.studentId} · {n.itemCount} 項 · ${n.totalPrice}
                </p>
              </div>
              <button
                onClick={() => dismissNotif(n.id)}
                className="text-stone-900/50 hover:text-stone-900 transition-colors shrink-0 mt-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <header className="flex items-center justify-between px-5 py-3 bg-stone-900 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-stone-400 hover:text-white transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <h1 className="text-lg font-bold tracking-tight">接單螢幕</h1>
          <div className="flex bg-stone-800 rounded-xl p-0.5">
            {(["breakfast", "lunch"] as const).map((d) => (
              <button key={d} onClick={() => setDept(d)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${dept === d ? "bg-white text-stone-900" : "text-stone-400 hover:text-white"}`}>
                {d === "breakfast" ? "早餐部" : "午餐部"}
              </button>
            ))}
          </div>
          <div className="flex gap-3 text-sm">
            <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-bold">
              待確認 {pendingCount}
            </span>
            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-bold">
              準備中 {confirmedCount}
            </span>
            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-bold">
              可取餐 {readyCount}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pos" className="text-sm text-stone-400 hover:text-white transition-colors px-3 py-1.5 bg-stone-800 rounded-lg">
            POS 點餐機
          </Link>
          {/* Sound status indicator (read-only) */}
          <div className="text-stone-500 p-1.5" title={soundPlayCountRef.current >= MAX_SOUND_PLAYS ? "提示音已結束" : `剩餘 ${MAX_SOUND_PLAYS - soundPlayCountRef.current} 次提示音`}>
            {soundPlayCountRef.current >= MAX_SOUND_PLAYS ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {activeOrders.length === 0 ? (
          <p className="text-stone-600 text-center mt-32 text-lg">目前沒有待處理訂單</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeOrders.map((order) => {
              const nextMap: Record<string, string> = { pending: "confirmed", confirmed: "ready", ready: "picked_up" };
              const next = nextMap[order.status];
              const borderClass = order.status === "pending"
                ? "border-amber-500 shadow-lg shadow-amber-500/20"
                : order.status === "confirmed"
                ? "border-blue-500/50 shadow-lg shadow-blue-500/10"
                : "border-emerald-500/50 shadow-lg shadow-emerald-500/10";
              return (
                <div key={order.id}
                  className={`bg-stone-900 border-2 rounded-2xl p-5 flex flex-col ${borderClass}`}>
                  <div className="mb-1">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </div>
                  <p className="text-3xl font-black tracking-tight text-white mb-3">
                    #{order.orderNumber.slice(-4)}
                  </p>

                  {/* Order detail sheet */}
                  <div className="text-sm space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-stone-500">訂購人</span>
                      <span className="text-stone-200 font-medium">
                        {order.className && `${order.className} `}{order.studentId} {order.studentName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">訂單時間</span>
                      <span className="text-stone-300">{new Date(order.createdAt).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">取餐時段</span>
                      <span className="text-stone-300">{order.pickupDate || ""} {order.pickupTime || "未指定"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">付款狀態</span>
                      <span className="text-amber-400 font-medium">現金（未付款）</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">備註</span>
                      <span className={`${order.note ? "text-amber-400 font-medium" : "text-stone-500"}`}>{order.note || "無"}</span>
                    </div>
                  </div>

                  <div className="bg-stone-800 rounded-xl p-3 mb-4 space-y-1">
                    <p className="text-xs text-stone-500 font-semibold mb-1.5">訂購項目</p>
                    {order.items.map((item: { name: string; quantity: number; price: number }, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-stone-200 font-medium">{item.name} × {item.quantity}</span>
                        <span className="text-stone-400">${item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="border-t border-stone-700 mt-2 pt-2 flex justify-between font-bold text-amber-400">
                      <span>總金額</span><span>${order.totalPrice}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    {next && (
                      <button onClick={() => updateOrderStatusSecure(order.id, next)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                          order.status === "pending" ? "bg-blue-500 hover:bg-blue-600"
                          : order.status === "confirmed" ? "bg-emerald-500 hover:bg-emerald-600"
                          : "bg-stone-600 hover:bg-stone-500"
                        } text-white`}>
                        {order.status === "pending" ? "確認接單" : order.status === "confirmed" ? "標記完成" : "已取餐"}
                      </button>
                    )}
                    <button onClick={() => updateOrderStatusSecure(order.id, "cancelled")}
                      className="px-4 py-3 rounded-xl text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all">
                      取消
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
