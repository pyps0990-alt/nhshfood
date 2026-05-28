"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { getDeptConfig } from "@/lib/department";
import { createOrderSecure } from "@/lib/hooks";

export default function OrderPage() {
  const { department } = useParams<{ department: string }>();
  const router = useRouter();
  const { items, total, clear, department: cartDept } = useCart();
  const cfg = getDeptConfig(department);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [note, setNote] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalPrice = total();

  if (cartDept !== department || items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-stone-400 mb-4 text-lg">購物車是空的</p>
        <Link href={`/${department}`} className={`${cfg.btnText} font-semibold`}>
          回去看菜單 →
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

    try {
      const order = await createOrderSecure({
        studentId: studentId.trim(),
        studentName: studentName.trim() || null,
        className: className.trim() || null,
        department,
        note: note.trim() || null,
        pickupTime: pickupTime || null,
        items: items.map((i) => ({
          menuItemId: i.menuItem.id,
          name: i.menuItem.name,
          quantity: i.quantity,
          price: i.menuItem.price,
        })),
      });

      clear();
      router.push(`/order/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "訂單送出失敗，請稍後再試");
      setSubmitting(false);
    }
  }

  const inputClass = `w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 ${cfg.ringColor} focus:border-transparent shadow-sm transition-all`;

  return (
    <div className="flex-1 flex flex-col">
      <header className={`sticky top-0 z-10 bg-gradient-to-r ${department === "breakfast" ? "from-amber-500 to-amber-600" : "from-orange-500 to-red-500"} text-white px-5 py-4 flex items-center gap-3 shadow-md`}>
        <Link href={`/${department}/cart`} className="text-xl hover:opacity-80 transition-opacity">←</Link>
        <h1 className="text-lg font-bold tracking-tight">填寫訂單資料</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 px-5 py-6 space-y-5 pb-36">
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">座號 *</label>
          <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="例：15" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">姓名</label>
          <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="選填" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">班級</label>
          <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="例：高二忠班" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">取餐時間</label>
          <div className="flex flex-wrap gap-2">
            {pickupOptions.map((t) => (
              <button key={t} type="button" onClick={() => setPickupTime(t)}
                className={`px-4 py-2 rounded-xl text-sm border transition-all duration-200 ${
                  pickupTime === t ? cfg.selectedBtn + " shadow-md" : "border-stone-200 text-stone-600 hover:bg-stone-50 bg-white"
                }`}
              >{t}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">備註</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：不要辣、加大飯量" rows={2} className={inputClass} />
        </div>

        <div className="card-premium p-5">
          <h3 className="font-semibold text-stone-800 mb-3">訂單內容</h3>
          {items.map((ci) => (
            <div key={ci.menuItem.id} className="flex justify-between text-sm py-1.5">
              <span className="text-stone-700">{ci.menuItem.name} × {ci.quantity}</span>
              <span className="font-medium">${ci.menuItem.price * ci.quantity}</span>
            </div>
          ))}
          <div className="border-t border-stone-100 mt-3 pt-3 flex justify-between font-bold text-lg">
            <span>合計</span>
            <span>${totalPrice}</span>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

        <div className="fixed bottom-0 inset-x-0 p-5 glass border-t border-stone-200/50">
          <button type="submit" disabled={submitting}
            className={`w-full ${cfg.btnBg} text-white rounded-2xl px-6 py-4 font-semibold disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200`}
          >
            {submitting ? "送出中..." : `送出訂單（$${totalPrice}）`}
          </button>
        </div>
      </form>
    </div>
  );
}
