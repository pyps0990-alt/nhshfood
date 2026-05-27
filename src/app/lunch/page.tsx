"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MenuCard } from "@/components/MenuCard";
import { CartBar } from "@/components/CartBar";
import type { MenuItem } from "@/types";

function isLunchTime() {
  const now = new Date();
  const h = now.getHours();
  return h >= 11 && h < 13;
}

export default function LunchPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(isLunchTime());

  useEffect(() => {
    const timer = setInterval(() => setOpen(isLunchTime()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch("/api/menu?department=lunch")
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
      <header className="sticky top-0 z-10 bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-4 flex items-center gap-3 shadow-md shadow-orange-200/30">
        <Link href="/" className="text-xl hover:opacity-80 transition-opacity">
          ←
        </Link>
        <div>
          <h1 className="text-lg font-bold tracking-tight">午餐部</h1>
          <p className="text-orange-100 text-xs">11:00 ~ 13:00</p>
        </div>
      </header>

      {!open && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 text-center py-5 px-5">
          <p className="font-semibold text-orange-800">目前非供餐時段</p>
          <p className="text-sm mt-1 text-orange-600/80">午餐部供應時間為 11:00 ~ 13:00，您可以先瀏覽菜單</p>
        </div>
      )}

      <div className="flex gap-2 px-5 py-4 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-5 py-2 rounded-full text-sm whitespace-nowrap transition-all duration-200 font-medium ${
              category === c
                ? "bg-orange-500 text-white shadow-md shadow-orange-200/50"
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
            <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-stone-400 mt-20">目前沒有品項</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <MenuCard key={item.id} item={item} department="lunch" />
            ))}
          </div>
        )}
      </main>

      <CartBar department="lunch" />
    </div>
  );
}
