"use client";

import { useRef } from "react";
import { useCart } from "@/lib/cart";
import { useExitAnimation } from "@/lib/useExitAnimation";
import { useT } from "@/lib/i18n";

export function CartBar({ department, onOpen }: { department: string; onOpen: () => void }) {
  const items = useCart((s) => s.items);
  const deptItems = items.filter((i) => i.department === department);
  const count = deptItems.reduce((s, i) => s + i.quantity, 0);
  const total = deptItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
  const t = useT();

  const { mounted, closing } = useExitAnimation(count > 0, 200);

  // Skip the slide-up entry animation when the bar is present on first mount
  // (e.g. navigating to /breakfast with items already in cart). Otherwise the
  // fixed bar visibly jumps in from below during the page transition. Only
  // animate on genuine 0→>0 transitions that happen after the page settled.
  const skipEnterRef = useRef(count > 0);
  const enterAnimation = skipEnterRef.current ? "" : "animate-slide-up";
  if (skipEnterRef.current && count === 0) skipEnterRef.current = false;

  const lastRef = useRef({ count, total });
  if (count > 0) lastRef.current = { count, total };
  const display = count > 0 ? { count, total } : lastRef.current;

  if (!mounted) return null;

  return (
    <div className={`lg-float ${closing ? "animate-slide-down" : enterAnimation}`}>
      <button
        onClick={onOpen}
        data-dept={department}
        className="lg-tinted w-full flex items-center justify-between rounded-full pl-2.5 pr-6 h-[60px] font-semibold active:scale-[0.98] transition-transform duration-300"
        aria-label={`${t("cart")}，${display.count} 件，共 $${display.total}`}
      >
        <span className="flex items-center gap-3">
          <span className="relative w-11 h-11 rounded-full bg-white/22 grid place-items-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 01-8 0" /></svg>
            <span key={display.count} className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-white text-[11px] font-bold grid place-items-center animate-cart-pop" style={{ color: "var(--brand)" }}>
              {display.count}
            </span>
          </span>
          <span className="text-[16px]">{t("cart")}</span>
        </span>
        <span className="text-[19px] font-bold tabular-nums" style={{ fontFamily: "var(--font-rounded)" }}>${display.total}</span>
      </button>
    </div>
  );
}
