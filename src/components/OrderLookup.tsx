"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderLookup() {
  const [orderId, setOrderId] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = orderId.trim().replace("#", "");
    if (id) {
      router.push(`/order/${id}`);
    }
  }

  return (
    <div>
      <p className="text-sm text-stone-500 mb-3 text-center">已有訂單？輸入編號查詢進度</p>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="訂單編號"
          className="flex-1 px-5 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent shadow-sm transition-all"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-stone-900 text-white rounded-2xl text-sm font-semibold hover:bg-stone-800 shadow-sm hover:shadow-md transition-all duration-200"
        >
          查詢
        </button>
      </form>
    </div>
  );
}
