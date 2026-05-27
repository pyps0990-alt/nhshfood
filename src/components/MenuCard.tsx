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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-24 sm:h-28 object-cover"
        />
      ) : (
        <div className="w-full h-24 sm:h-28 bg-gray-100 flex items-center justify-center text-3xl">
          {department === "breakfast" ? "🥪" : "🍱"}
        </div>
      )}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-bold text-base sm:text-lg">${item.price}</span>
          <button
            onClick={() => add(item, department)}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-white transition-colors active:scale-95 ${cfg.btnBg}`}
          >
            加入
          </button>
        </div>
      </div>
    </div>
  );
}
