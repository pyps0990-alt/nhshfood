"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Order } from "@/types";

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待確認", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "已確認", color: "bg-blue-100 text-blue-800" },
  ready: { label: "可取餐", color: "bg-green-100 text-green-800" },
  picked_up: { label: "已取餐", color: "bg-gray-100 text-gray-600" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-800" },
};

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

  if (loading) return <p className="text-center mt-20 text-gray-400">載入中...</p>;
  if (!order) return <p className="text-center mt-20 text-gray-400">找不到訂單</p>;

  const status = statusMap[order.status] || statusMap.pending;
  const deptLabel = order.department === "breakfast" ? "早餐部" : "午餐部";

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-xl text-gray-500">←</Link>
        <h1 className="text-lg font-bold">訂單狀態</h1>
      </header>

      <main className="flex-1 px-4 py-6 space-y-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">訂單編號</p>
          <p className="text-2xl font-bold">#{order.id}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">部門</span>
            <span>{deptLabel}</span>
          </div>
          {order.className && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">班級</span>
              <span>{order.className}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">座號</span>
            <span>{order.studentId}</span>
          </div>
          {order.pickupTime && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">取餐時間</span>
              <span>{order.pickupTime}</span>
            </div>
          )}
          {order.note && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">備註</span>
              <span>{order.note}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h3 className="font-medium mb-2">訂單內容</h3>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-1">
              <span>{item.menuItem.name} × {item.quantity}</span>
              <span>${item.price * item.quantity}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
            <span>合計</span>
            <span>${order.totalPrice}</span>
          </div>
        </div>

        {order.status === "ready" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-800 font-semibold text-lg">餐點已備好！</p>
            <p className="text-green-600 text-sm mt-1">請至{deptLabel}取餐</p>
          </div>
        )}
      </main>
    </div>
  );
}
