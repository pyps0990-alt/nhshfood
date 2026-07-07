"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

export function OrderLookup() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const t = useT();

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
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-3 text-center">{t("order_lookup_title")}</p>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          placeholder={t("order_lookup_placeholder")}
          className="flex-1 px-5 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 focus:border-transparent shadow-sm transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
        >
          {loading ? "..." : t("order_lookup_btn")}
        </button>
      </form>
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
