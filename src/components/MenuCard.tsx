"use client";

import { useState, useCallback } from "react";
import { useCart } from "@/lib/cart";
import { getDeptConfig } from "@/lib/department";
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
  const cfg = getDeptConfig(department);
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
    <div className={`card-premium overflow-hidden flex flex-col animate-fade-in relative ${isSoldOut ? "opacity-70" : ""}`}>
      {/* Image (or tag-only header when no image) */}
      {item.imageUrl ? (
        <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-800 overflow-hidden">
          <img
            src={item.imageUrl}
            alt={tMenu(item.name)}
            loading="lazy"
            className={`w-full h-full object-cover ${isSoldOut ? "grayscale" : ""}`}
          />
          {tags.length > 0 && (
            <div className="absolute top-2 left-2 flex gap-1">
              {tags.map((tag) => (
                <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shadow-sm ${MENU_TAG_COLORS[tag]}`}>
                  {MENU_TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}
          {isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="bg-stone-900/80 text-white text-xs font-bold px-3 py-1 rounded-full">
                {t("sold_out")}
              </span>
            </div>
          )}
        </div>
      ) : (
        tags.length > 0 && (
          <div className="flex gap-1 px-3 pt-2.5">
            {tags.map((tag) => (
              <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${MENU_TAG_COLORS[tag]}`}>
                {MENU_TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        )
      )}

      {justAdded && (
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <span className="animate-added-fly inline-block bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            +1
          </span>
        </div>
      )}

      <div className={`p-3 sm:p-4 flex flex-col flex-1 ${!item.imageUrl && tags.length > 0 ? "pt-1.5" : ""}`}>
        <div className="flex items-center gap-1.5">
          <h3 className="font-bold text-sm sm:text-base leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
            {tMenu(item.name)}
          </h3>
          {qty > 0 && (
            <span className="bg-[#E23D28] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 animate-cart-pop">
              {qty}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-dim mt-1 line-clamp-2">{tMenu(item.description)}</p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-value text-xl">${item.price}</span>
            {isLowStock && (
              <span className="block text-[10px] font-bold text-red-500 dark:text-red-400 mt-0.5">
                {t("only_left")} {item.stock} {t("units")}
              </span>
            )}
          </div>

          {isSoldOut ? (
            <span className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-stone-400 dark:bg-stone-600 shrink-0">
              {t("sold_out")}
            </span>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              aria-label={`${t("add")} ${tMenu(item.name)}`}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all duration-150 active:scale-90 active:brightness-110 shadow-sm hover:shadow-md shrink-0 ${cfg.btnBg}`}
            >
              <span className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {t("add")}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleMinus}
                aria-label={`${t("delete")} ${tMenu(item.name)}`}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center text-lg hover:bg-stone-200 dark:hover:bg-stone-600 active:scale-85 active:bg-stone-300 dark:active:bg-stone-500 transition-all duration-150 font-medium"
              >
                −
              </button>
              <span className={`w-7 text-center font-bold text-sm text-stone-800 dark:text-stone-200 ${justAdded ? "animate-cart-pop" : ""}`}>
                {qty}
              </span>
              <button
                onClick={handleAdd}
                aria-label={`${t("add")} ${tMenu(item.name)}`}
                className={`w-8 h-8 rounded-full ${cfg.btnBg} text-white flex items-center justify-center text-lg active:scale-85 active:brightness-110 transition-all duration-150 font-medium`}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
