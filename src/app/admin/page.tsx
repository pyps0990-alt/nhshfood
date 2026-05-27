"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface OrderSummary {
  id: number;
  studentId: string;
  studentName: string | null;
  className: string | null;
  department: string;
  status: string;
  totalPrice: number;
  note: string | null;
  pickupTime: string | null;
  createdAt: string;
  items: { quantity: number; price: number; menuItem: { name: string } }[];
}

const statusFlow = ["pending", "confirmed", "ready", "picked_up"];
const statusLabels: Record<string, string> = {
  pending: "待確認",
  confirmed: "已確認",
  ready: "可取餐",
  picked_up: "已取餐",
  cancelled: "已取消",
};
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  picked_up: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [dept, setDept] = useState<string>("breakfast");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  function fetchOrders() {
    const params = new URLSearchParams({ department: dept });
    if (filterStatus !== "all") params.set("status", filterStatus);
    fetch(`/api/orders?${params}`)
      .then((r) => r.json())
      .then(setOrders);
  }

  useEffect(() => {
    fetchOrders();
    const timer = setInterval(fetchOrders, 10000);
    return () => clearInterval(timer);
  }, [dept, filterStatus]);

  async function updateStatus(orderId: number, status: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
  }

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
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-xl">←</Link>
        <h1 className="text-lg font-bold">管理面板</h1>
        <Link href="/admin/menu" className="ml-auto text-sm bg-gray-700 px-3 py-1 rounded-lg">
          菜單管理
        </Link>
        <button
          onClick={async () => {
            await fetch("/api/auth", { method: "DELETE" });
            window.location.href = "/admin/login";
          }}
          className="text-sm bg-gray-700 px-3 py-1 rounded-lg"
        >
          登出
        </button>
      </header>

      <div className="flex gap-2 px-4 py-3 border-b border-gray-200">
        {["breakfast", "lunch"].map((d) => (
          <button
            key={d}
            onClick={() => setDept(d)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              dept === d ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {d === "breakfast" ? "早餐部" : "午餐部"}
          </button>
        ))}
      </div>

      <div className="px-4 py-3 flex gap-4 text-sm">
        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
          今日 {todayOrders.length} 筆
        </span>
        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg">
          營業額 ${todayRevenue}
        </span>
      </div>

      <div className="flex gap-2 px-4 py-2 overflow-x-auto">
        {["all", ...statusFlow, "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
              filterStatus === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {s === "all" ? "全部" : statusLabels[s]}
          </button>
        ))}
      </div>

      <main className="flex-1 px-4 py-3 space-y-3 pb-8">
        {orders.length === 0 && (
          <p className="text-center text-gray-400 mt-10">沒有訂單</p>
        )}
        {orders.map((order) => {
          const next = nextStatus(order.status);
          return (
            <div key={order.id} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-bold text-lg">#{order.id}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(order.createdAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div className="text-sm text-gray-600 space-y-0.5">
                <p>{order.className} {order.studentId} {order.studentName}</p>
                {order.pickupTime && <p>取餐：{order.pickupTime}</p>}
                {order.note && <p className="text-orange-600">備註：{order.note}</p>}
              </div>

              <div className="mt-2 text-sm">
                {order.items.map((item, i) => (
                  <span key={i} className="mr-2">
                    {item.menuItem.name}×{item.quantity}
                  </span>
                ))}
                <span className="font-bold ml-2">${order.totalPrice}</span>
              </div>

              <div className="mt-3 flex gap-2">
                {next && (
                  <button
                    onClick={() => updateStatus(order.id, next)}
                    className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium"
                  >
                    → {statusLabels[next]}
                  </button>
                )}
                {order.status !== "cancelled" && order.status !== "picked_up" && (
                  <button
                    onClick={() => updateStatus(order.id, "cancelled")}
                    className="px-4 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm"
                  >
                    取消
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
