"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MenuCard } from "@/components/MenuCard";
import { CartBar } from "@/components/CartBar";
import type { MenuItem } from "@/types";

export default function BreakfastPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/menu?department=breakfast")
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      });
  }, []);

  const categories = ["all", ...new Set(items.map((i) => i.category))];
  const filtered =
    category === "all" ? items : items.filter((i) => i.category === category);

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 bg-amber-500 text-white px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-xl">
          ←
        </Link>
        <h1 className="text-lg font-bold">早餐部</h1>
        <span className="text-amber-100 text-sm ml-auto">早上～下午供應</span>
      </header>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              category === c
                ? "bg-amber-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {c === "all" ? "全部" : c}
          </button>
        ))}
      </div>

      <main className="flex-1 px-4 pb-24">
        {loading ? (
          <p className="text-center text-gray-400 mt-10">載入中...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">目前沒有品項</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
