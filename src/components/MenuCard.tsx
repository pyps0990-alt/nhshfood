"use client";

import { useState, useCallback } from "react";
import { useCart } from "@/lib/cart";
import { getDeptConfig } from "@/lib/department";
import type { MenuItem } from "@/types";
import { MENU_TAG_LABELS, MENU_TAG_COLORS } from "@/types";

export function MenuCard({
  item,
  department,
}: {
  item: MenuItem;
  department: string;
}) {
  const { add, items, updateQty, department: cartDept } = useCart();
  const cfg = getDeptConfig(department);
  const [justAdded, setJustAdded] = useState(false);

  const cartItem = cartDept === department
    ? items.find((i) => i.menuItem.id === item.id)
    : undefined;
  const qty = cartItem?.quantity || 0;
  const isSoldOut = item.soldOut || (item.stock !== null && item.stock !== undefined && item.stock <= 0);

  const handleAdd = useCallback(() => {
    if (isSoldOut) return;
    add(item, department);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 600);
  }, [add, item, department, isSoldOut]);

  const handleMinus = useCallback(() => {
    if (qty > 0) updateQty(item.id, qty - 1);
  }, [updateQty, item.id, qty]);

  return (
    <div className={`card-premium overflow-hidden flex flex-col animate-fade-in relative ${isSoldOut ? "opacity-60" : ""}`}>
      {/* Tags */}
      {(item.tags || []).length > 0 && (
        <div className="flex gap-1 px-3 pt-2.5">
          {(item.tags || []).map((tag) => (
            <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${MENU_TAG_COLORS[tag]}`}>
              {MENU_TAG_LABELS[tag]}
            </span>
          ))}
        </div>
      )}

      {/* Added feedback */}
      {justAdded && (
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <span className="animate-added-fly inline-block bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            +1
          </span>
        </div>
      )}

      <div className={`p-3 sm:p-4 flex flex-col flex-1 ${(item.tags || []).length > 0 ? "pt-1.5" : ""}`}>
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-stone-900 text-sm sm:text-base leading-tight">
            {item.name}
          </h3>
          {qty > 0 && (
            <span className="bg-[#E23D28] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 animate-cart-pop">
              {qty}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-stone-400 mt-1 line-clamp-1">{item.description}</p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between">
          <div>
            <span className="font-bold text-lg text-stone-800">${item.price}</span>
            {item.stock !== null && item.stock !== undefined && !isSoldOut && (
              <span className="text-[10px] text-stone-400 ml-1.5">剩 {item.stock} 份</span>
            )}
          </div>

          {isSoldOut ? (
            <span className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-stone-400">
              已售罄
            </span>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md ${cfg.btnBg}`}
            >
              <span className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                加入
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleMinus}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-lg hover:bg-stone-200 transition-colors active:scale-90 font-medium"
              >
                −
              </button>
              <span className={`w-7 text-center font-bold text-sm ${justAdded ? "animate-cart-pop" : ""}`}>
                {qty}
              </span>
              <button
                onClick={handleAdd}
                className={`w-8 h-8 rounded-full ${cfg.btnBg} text-white flex items-center justify-center text-lg transition-colors active:scale-90 font-medium`}
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
