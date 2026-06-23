"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderLookup() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim().replace("#", "");
    if (!q) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/orders/lookup?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "查詢失敗" }));
        setError(data.error || "查詢失敗");
        return;
      }
      const data = await res.json();
      router.push(`/order/${data.id}`);
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-stone-500 mb-3 text-center">已有訂單？輸入後四碼查詢</p>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          placeholder="訂單後四碼，如 0001"
          className="flex-1 px-5 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent shadow-sm transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-stone-900 text-white rounded-2xl text-sm font-semibold hover:bg-stone-800 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
        >
          {loading ? "..." : "查詢"}
        </button>
      </form>
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
