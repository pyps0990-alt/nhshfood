"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";

/**
 * Bottom toolbar for menu pages (iOS 26/27 iPhone pattern): the primary
 * action (cart) as prominent glass, and search as a glass button at the
 * trailing end that expands into a field.
 */
export function MenuToolbar({
  department,
  onOpenCart,
  search,
  onSearch,
}: {
  department: string;
  onOpenCart: () => void;
  search: string;
  onSearch: (q: string) => void;
}) {
  const t = useT();
  const items = useCart((s) => s.items);
  const deptItems = items.filter((i) => i.department === department);
  const count = deptItems.reduce((s, i) => s + i.quantity, 0);
  const total = deptItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searching) inputRef.current?.focus();
  }, [searching]);

  if (searching) {
    return (
      <div className="lg-float flex items-center gap-2" role="search">
        <div className="lg-glass flex-1 h-[52px] rounded-full flex items-center gap-2 pl-4 pr-2 lg-materialize">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="lg-ink-2 shrink-0" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("search_menu")}
            aria-label={t("search_menu")}
            className="flex-1 min-w-0 bg-transparent outline-none ios-body lg-ink placeholder:text-[var(--label-3)]"
          />
          {search && (
            <button onClick={() => onSearch("")} aria-label="清除" className="w-7 h-7 rounded-full grid place-items-center bg-[var(--fill)] lg-ink-2 shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <button
          onClick={() => { setSearching(false); onSearch(""); }}
          aria-label="關閉搜尋"
          className="lg-glass lg-btn lg-btn-icon !w-[52px] !min-h-[52px] lg-ink lg-materialize"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="lg-float flex items-center justify-end gap-2">
      {count > 0 && (
        <button
          onClick={onOpenCart}
          data-dept={department}
          aria-label={`${t("cart")}，${count} 件，共 $${total}`}
          className="lg-glass-prominent lg-btn flex-1 !min-h-[56px] !justify-between !pl-2 !pr-5 lg-materialize"
        >
          <span className="flex items-center gap-2.5">
            <span className="relative w-11 h-11 rounded-full bg-white/22 grid place-items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 01-8 0" /></svg>
              <span key={count} className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-white text-[12px] font-bold grid place-items-center animate-cart-pop" style={{ color: "var(--tint)" }}>{count}</span>
            </span>
            <span className="ios-headline">{t("cart")}</span>
          </span>
          <span className="text-[19px] font-bold tabular-nums" style={{ fontFamily: "var(--font-rounded)" }}>${total}</span>
        </button>
      )}
      <button
        onClick={() => setSearching(true)}
        aria-label={t("search_menu")}
        className="lg-glass lg-btn lg-btn-icon !w-[56px] !min-h-[56px] lg-ink shrink-0"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        {search && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full" style={{ background: "var(--tint)" }} />}
      </button>
    </div>
  );
}
