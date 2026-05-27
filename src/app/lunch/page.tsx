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
      <header className="sticky top-0 z-10 bg-orange-500 text-white px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-xl">
          ←
        </Link>
        <h1 className="text-lg font-bold">午餐部</h1>
        <span className="text-orange-100 text-sm ml-auto">11:00 ~ 13:00</span>
      </header>

      {!open && (
        <div className="bg-orange-100 text-orange-800 text-center py-4 px-4">
          <p className="font-semibold">目前非供餐時段</p>
          <p className="text-sm mt-1">午餐部供應時間為 11:00 ~ 13:00，您可以先瀏覽菜單</p>
        </div>
      )}

      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              category === c
                ? "bg-orange-500 text-white"
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
              <MenuCard key={item.id} item={item} department="lunch" />
            ))}
          </div>
        )}
      </main>

      <CartBar department="lunch" />
    </div>
  );
}
