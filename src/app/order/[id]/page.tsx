"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Order } from "@/types";

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "待確認", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  confirmed: { label: "準備中", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  ready: { label: "可取餐", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  picked_up: { label: "已取餐", color: "text-stone-500", bg: "bg-stone-50 border-stone-200" },
  cancelled: { label: "已取消", color: "text-red-600", bg: "bg-red-50 border-red-200" },
};

const steps = ["pending", "confirmed", "ready", "picked_up"];

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function fetchOrder() {
      fetch(`/api/orders/${id}`)
        .then((r) => r.json())
        .then(setOrder)
        .finally(() => setLoading(false));
    }
    fetchOrder();
    const timer = setInterval(fetchOrder, 10000);
    return () => clearInterval(timer);
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!order) return <p className="text-center mt-20 text-stone-400">找不到訂單</p>;

  const status = statusMap[order.status] || statusMap.pending;
  const deptLabel = order.department === "breakfast" ? "早餐部" : "午餐部";
  const currentStep = steps.indexOf(order.status);

  return (
    <div className="flex-1 flex flex-col">
      <header className="glass border-b border-stone-200/50 px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-xl text-stone-400 hover:text-stone-600 transition-colors">←</Link>
        <h1 className="text-lg font-bold text-stone-900">訂單狀態</h1>
      </header>

      <main className="flex-1 px-5 py-8 space-y-6 animate-fade-in">
        <div className="text-center">
          <p className="text-sm text-stone-500 mb-1">取餐號碼</p>
          <p className="text-5xl font-black text-stone-900 tracking-tight">#{order.orderNumber}</p>
          <div className={`inline-flex items-center mt-4 px-5 py-2 rounded-full text-sm font-semibold border ${status.bg} ${status.color}`}>
            {status.label}
          </div>
        </div>

        {/* Progress steps */}
        {order.status !== "cancelled" && (
          <div className="flex items-center justify-center gap-1 px-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-3 h-3 rounded-full transition-colors ${i <= currentStep ? "bg-emerald-500" : "bg-stone-200"}`} />
                {i < steps.length - 1 && (
                  <div className={`w-12 h-0.5 transition-colors ${i < currentStep ? "bg-emerald-500" : "bg-stone-200"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="card-premium p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">部門</span>
            <span className="font-medium">{deptLabel}</span>
          </div>
          {order.className && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">班級</span>
              <span className="font-medium">{order.className}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">座號</span>
            <span className="font-medium">{order.studentId}</span>
          </div>
          {order.pickupTime && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">取餐時間</span>
              <span className="font-medium">{order.pickupTime}</span>
            </div>
          )}
          {order.note && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">備註</span>
              <span className="font-medium text-orange-600">{order.note}</span>
            </div>
          )}
        </div>

        <div className="card-premium p-5">
          <h3 className="font-semibold text-stone-800 mb-3">訂單內容</h3>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5">
              <span className="text-stone-700">{item.name} × {item.quantity}</span>
              <span className="font-medium">${item.price * item.quantity}</span>
            </div>
          ))}
          <div className="border-t border-stone-100 mt-3 pt-3 flex justify-between font-bold text-lg">
            <span>合計</span>
            <span>${order.totalPrice}</span>
          </div>
        </div>

        {order.status === "ready" && (
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6 text-center animate-slide-up">
            <p className="text-emerald-800 font-bold text-xl">餐點已備好！</p>
            <p className="text-emerald-600 mt-2">請至{deptLabel}取餐</p>
          </div>
        )}
      </main>
    </div>
  );
}
