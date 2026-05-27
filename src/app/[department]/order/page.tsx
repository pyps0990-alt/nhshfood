"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function OrderPage() {
  const { department } = useParams<{ department: string }>();
  const router = useRouter();
  const { items, total, clear, department: cartDept } = useCart();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [note, setNote] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const color = department === "breakfast" ? "amber" : "orange";
  const totalPrice = total();

  if (cartDept !== department || items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <p className="text-gray-400 mb-4">購物車是空的</p>
        <Link href={`/${department}`} className={`text-${color}-500 font-medium`}>
          回去看菜單
        </Link>
      </div>
    );
  }

  const pickupOptions =
    department === "breakfast"
      ? ["盡快取餐", "08:00", "09:00", "10:00", "11:00", "12:00"]
      : ["11:30", "12:00", "12:10", "12:20", "12:30"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId.trim()) {
      setError("請填寫座號");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: studentId.trim(),
        studentName: studentName.trim() || null,
        className: className.trim() || null,
        department,
        note: note.trim() || null,
        pickupTime: pickupTime || null,
        items: items.map((i) => ({
          menuItemId: i.menuItem.id,
          quantity: i.quantity,
          price: i.menuItem.price,
        })),
      }),
    });

    if (!res.ok) {
      setError("訂單送出失敗，請稍後再試");
      setSubmitting(false);
      return;
    }

    const order = await res.json();
    clear();
    router.push(`/order/${order.id}`);
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className={`sticky top-0 z-10 bg-${color}-500 text-white px-4 py-3 flex items-center gap-3`}>
        <Link href={`/${department}/cart`} className="text-xl">←</Link>
        <h1 className="text-lg font-bold">填寫訂單資料</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 px-4 py-4 space-y-4 pb-32">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">座號 *</label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="例：15"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="選填"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">班級</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="例：高二忠班"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">取餐時間</label>
          <div className="flex flex-wrap gap-2">
            {pickupOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPickupTime(t)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  pickupTime === t
                    ? `bg-${color}-500 text-white border-${color}-500`
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例：不要辣、加大飯量"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-medium mb-2">訂單內容</h3>
          {items.map((ci) => (
            <div key={ci.menuItem.id} className="flex justify-between text-sm py-1">
              <span>{ci.menuItem.name} × {ci.quantity}</span>
              <span>${ci.menuItem.price * ci.quantity}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
            <span>合計</span>
            <span>${totalPrice}</span>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-200">
          <button
            type="submit"
            disabled={submitting}
            className={`w-full bg-${color}-500 text-white rounded-xl px-5 py-3 font-medium disabled:opacity-50`}
          >
            {submitting ? "送出中..." : `送出訂單（$${totalPrice}）`}
          </button>
        </div>
      </form>
    </div>
  );
}
