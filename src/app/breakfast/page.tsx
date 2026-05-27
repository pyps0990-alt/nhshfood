"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuCard } from "@/components/MenuCard";
import { CartBar } from "@/components/CartBar";
import { useMenuItems } from "@/lib/hooks";

export default function BreakfastPage() {
  const { items, loading } = useMenuItems("breakfast");
  const [category, setCategory] = useState<string>("all");

  const categories = ["all", ...new Set(items.map((i) => i.category))];
  const filtered =
    category === "all" ? items : items.filter((i) => i.category === category);

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-4 flex items-center gap-3 shadow-md shadow-amber-200/30">
        <Link href="/" className="text-xl hover:opacity-80 transition-opacity">←</Link>
        <div>
          <h1 className="text-lg font-bold tracking-tight">早餐部</h1>
          <p className="text-amber-100 text-xs">早上～下午供應</p>
        </div>
      </header>

      <div className="flex gap-2 px-5 py-4 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-5 py-2 rounded-full text-sm whitespace-nowrap transition-all duration-200 font-medium ${
              category === c
                ? "bg-amber-500 text-white shadow-md shadow-amber-200/50"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {c === "all" ? "全部" : c}
          </button>
        ))}
      </div>

      <main className="flex-1 px-5 pb-28">
        {loading ? (
          <div className="flex items-center justify-center mt-20">
            <div className="w-8 h-8 border-3 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-stone-400 mt-20">目前沒有品項</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <MenuCard key={item.id} item={item} department="breakfast" />
            ))}
          </div>
        )}
      </main>

      <CartBar department="breakfast" />
    </div>
  );
}
