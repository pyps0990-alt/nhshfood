"use client";

import { useCart } from "@/lib/cart";
import { getDeptConfig } from "@/lib/department";
import type { MenuItem } from "@/types";

export function MenuCard({
  item,
  department,
}: {
  item: MenuItem;
  department: string;
}) {
  const add = useCart((s) => s.add);
  const cfg = getDeptConfig(department);

  return (
    <div className="card-premium overflow-hidden flex flex-col animate-fade-in">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-28 sm:h-32 object-cover"
        />
      ) : (
        <div className="w-full h-28 sm:h-32 bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center text-4xl">
          {department === "breakfast" ? "🥪" : "🍱"}
        </div>
      )}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-stone-900 text-sm sm:text-base leading-tight">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-xs text-stone-400 mt-1 line-clamp-1">{item.description}</p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="font-bold text-lg text-stone-800">${item.price}</span>
          <button
            onClick={() => add(item, department)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md ${cfg.btnBg}`}
          >
            加入
          </button>
        </div>
      </div>
    </div>
  );
}
