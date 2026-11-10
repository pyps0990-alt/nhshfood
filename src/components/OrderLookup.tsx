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
    <div className="lg-card p-4">
      <p className="text-[13px] font-semibold lg-ink-2 mb-2.5 px-1">{t("order_lookup_title")}</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          placeholder={t("order_lookup_placeholder")}
          aria-label={t("order_lookup_title")}
          className="lg-field lg-pill flex-1 !min-h-[44px] text-[15px]"
        />
        <button type="submit" disabled={loading || !input.trim()} className="lg-btn lg-tinted shrink-0">
          {loading ? "…" : t("order_lookup_btn")}
        </button>
      </form>
      {error && <p className="text-red-500 text-xs mt-2 px-1" role="alert">{error}</p>}
    </div>
  );
}
