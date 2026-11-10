"use client";

import { useState, useCallback } from "react";
import { useCart } from "@/lib/cart";
import type { MenuItem } from "@/types";
import { MENU_TAG_LABELS, MENU_TAG_COLORS } from "@/types";
import { useT, useMenuTranslate } from "@/lib/i18n";
import { haptic } from "@/lib/haptic";

const LOW_STOCK_THRESHOLD = 5;

export function MenuCard({
  item,
  department,
}: {
  item: MenuItem;
  department: string;
}) {
  const add = useCart((s) => s.add);
  const updateQty = useCart((s) => s.updateQty);
  // Subscribe to *only* this item's quantity (a primitive), so a change to any
  // other cart item doesn't re-render this card.
  const qty = useCart(
    (s) => s.items.find((i) => i.menuItem.id === item.id && i.department === department)?.quantity || 0
  );
  const t = useT();
  const tMenu = useMenuTranslate();
  const [justAdded, setJustAdded] = useState(false);

  const isSoldOut = item.soldOut || (item.stock !== null && item.stock !== undefined && item.stock <= 0);
  const isLowStock =
    !isSoldOut && item.stock !== null && item.stock !== undefined && item.stock <= LOW_STOCK_THRESHOLD;
  const tags = item.tags || [];

  const handleAdd = useCallback(() => {
    if (isSoldOut) return;
    haptic(8);
    add(item, department);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 600);
  }, [add, item, department, isSoldOut]);

  const handleMinus = useCallback(() => {
    if (qty > 0) {
      haptic(6);
      updateQty(item.id, qty - 1);
    }
  }, [updateQty, item.id, qty]);

  return (
    <div className={`lg-card lg-hover overflow-hidden flex flex-col relative ${isSoldOut ? "opacity-70" : ""}`}>
      {item.imageUrl ? (
        <div className="relative aspect-[4/3] m-1.5 mb-0 rounded-[20px] overflow-hidden bg-black/5 dark:bg-white/5">
          <img
            src={item.imageUrl}
            alt={tMenu(item.name)}
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover transition-transform duration-700 ${isSoldOut ? "grayscale" : ""}`}
          />
          {tags.length > 0 && (
            <div className="absolute top-2 left-2 flex gap-1">
              {tags.map((tag) => (
                <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm backdrop-blur-md ${MENU_TAG_COLORS[tag]}`}>
                  {MENU_TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}
          {isSoldOut && (
            <div className="absolute inset-0 grid place-items-center bg-black/25">
              <span className="lg-smoke text-xs font-bold px-3 py-1 rounded-full">{t("sold_out")}</span>
            </div>
          )}
        </div>
      ) : (
        tags.length > 0 && (
          <div className="flex gap-1 px-3.5 pt-3">
            {tags.map((tag) => (
              <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${MENU_TAG_COLORS[tag]}`}>
                {MENU_TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        )
      )}

      {justAdded && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <span className="animate-added-fly inline-block lg-tinted text-xs font-bold px-2 py-1 rounded-full">+1</span>
        </div>
      )}

      <div className={`px-3.5 pt-3 pb-3.5 flex flex-col flex-1 ${!item.imageUrl && tags.length > 0 ? "pt-1.5" : ""}`}>
        <h3 className="font-semibold text-[15px] leading-snug lg-ink line-clamp-2">{tMenu(item.name)}</h3>
        {item.description && (
          <p className="text-[12px] lg-ink-3 mt-1 line-clamp-2 leading-snug">{tMenu(item.description)}</p>
        )}

        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[20px] font-bold lg-ink tracking-tight" style={{ fontFamily: "var(--font-rounded)" }}>
              ${item.price}
            </span>
            {isLowStock && (
              <span className="block text-[10px] font-bold text-red-500 dark:text-red-400 mt-0.5">
                {t("only_left")} {item.stock} {t("units")}
              </span>
            )}
          </div>

          {isSoldOut ? (
            <span className="lg-btn lg-btn-sm lg-thin lg-ink-3 shrink-0">{t("sold_out")}</span>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              aria-label={`${t("add")} ${tMenu(item.name)}`}
              className="lg-btn lg-btn-icon lg-tinted shrink-0 !w-9 !min-h-9"
              data-dept={department}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          ) : (
            <div className="flex items-center gap-0.5 shrink-0 lg-thin rounded-full p-0.5">
              <button
                onClick={handleMinus}
                aria-label={`${t("delete")} ${tMenu(item.name)}`}
                className="w-8 h-8 rounded-full grid place-items-center lg-ink-2 active:scale-90 transition-transform"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /></svg>
              </button>
              <span className={`min-w-6 text-center font-bold text-[15px] lg-ink tabular-nums ${justAdded ? "animate-cart-pop" : ""}`}>{qty}</span>
              <button
                onClick={handleAdd}
                aria-label={`${t("add")} ${tMenu(item.name)}`}
                className="w-8 h-8 rounded-full grid place-items-center lg-tinted active:scale-90 transition-transform"
                data-dept={department}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
