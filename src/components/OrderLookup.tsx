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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={orderId}
        onChange={(e) => setOrderId(e.target.value)}
        placeholder="輸入訂單編號查詢"
        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
      <button
        type="submit"
        className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        查詢
      </button>
    </form>
  );
}
