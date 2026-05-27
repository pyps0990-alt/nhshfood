"use client";

import { useCart } from "@/lib/cart";
import type { MenuItem } from "@/types";

export function MenuCard({
  item,
  department,
}: {
  item: MenuItem;
  department: string;
}) {
  const add = useCart((s) => s.add);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-28 object-cover"
        />
      ) : (
        <div className="w-full h-28 bg-gray-100 flex items-center justify-center text-3xl">
          {department === "breakfast" ? "🥪" : "🍱"}
        </div>
      )}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-bold text-lg">${item.price}</span>
          <button
            onClick={() => add(item, department)}
            className={`px-3 py-1 rounded-lg text-sm font-medium text-white transition-colors ${
              department === "breakfast"
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            加入
          </button>
        </div>
      </div>
    </div>
  );
}
