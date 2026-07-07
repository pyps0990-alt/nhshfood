"use client";

import { useRef } from "react";
import { useCart } from "@/lib/cart";
import { getDeptConfig } from "@/lib/department";
import { useExitAnimation } from "@/lib/useExitAnimation";
import { useT } from "@/lib/i18n";

export function CartBar({ department, onOpen }: { department: string; onOpen: () => void }) {
  const items = useCart((s) => s.items);
  const deptItems = items.filter((i) => i.department === department);
  const count = deptItems.reduce((s, i) => s + i.quantity, 0);
  const total = deptItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
  const cfg = getDeptConfig(department);
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
    <div className={`fixed bottom-0 inset-x-0 p-4 glass dark:bg-stone-900/85 border-t border-stone-200/50 dark:border-stone-800 z-20 ${closing ? "animate-slide-down" : enterAnimation}`}>
      <button
        onClick={onOpen}
        className={`w-full flex items-center justify-between ${cfg.headerBg} text-white rounded-2xl px-6 py-4 font-semibold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-150`}
      >
        <span className="flex items-center gap-2">
          <span className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold animate-cart-pop">
            {display.count}
          </span>
          {t("cart")}
        </span>
        <span className="text-lg font-bold">${display.total}</span>
      </button>
    </div>
  );
}
