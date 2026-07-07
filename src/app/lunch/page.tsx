"use client";

import { useEffect, useState, useMemo } from "react";
import { MenuCard } from "@/components/MenuCard";
import { CartBar } from "@/components/CartBar";
import { DepartmentCartSheet } from "@/components/DepartmentCartSheet";
import { BackButton } from "@/components/BackButton";
import { MenuLoader } from "@/components/MenuLoader";
import { useMenuItems } from "@/lib/hooks";
import { useT, useMenuTranslate } from "@/lib/i18n";

function isLunchTime() {
  const now = new Date();
  const h = now.getHours();
  return h >= 11 && h < 13;
}

export default function LunchPage() {
  const { items, loading, error, retry } = useMenuItems("lunch");
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(isLunchTime());
  const [showCart, setShowCart] = useState(false);
  const t = useT();
  const tMenu = useMenuTranslate();

  useEffect(() => {
    const timer = setInterval(() => setOpen(isLunchTime()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("cart") === "1") setShowCart(true);
  }, []);

  const categories = ["all", ...new Set(items.map((i) => i.category))];
  const filtered = useMemo(() => {
    const byCategory = category === "all" ? items : items.filter((i) => i.category === category);
    const q = search.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter((i) => {
      const name = tMenu(i.name).toLowerCase();
      const desc = (i.description ? tMenu(i.description) : "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [items, category, search, tMenu]);

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-[#FF6B35] to-[#E23D28] text-white px-5 py-4 flex items-center gap-3 shadow-md shadow-orange-200/30">
        <BackButton href="/" variant="light" />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">{t("lunch")}</h1>
          <p className="text-orange-100 text-xs">{t("lunch_hours")}</p>
        </div>
      </header>

      {!open && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border-b border-orange-100 dark:border-orange-900/40 text-center py-5 px-5">
          <p className="font-semibold text-orange-800 dark:text-orange-300">{t("not_serving")}</p>
          <p className="text-sm mt-1 text-orange-600/80 dark:text-orange-400/70">{t("not_serving_desc")}</p>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-3">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_menu")}
            className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/40 focus:border-[#FF6B35] transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-200 font-medium border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/40 ${
              category === c
                ? "bg-orange-50 dark:bg-orange-950/30 border-[#FF6B35] text-[#FF6B35] shadow-sm"
                : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-sm"
            }`}
          >
            {category === c && (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
            {c === "all" ? t("all") : tMenu(c)}
          </button>
        ))}
      </div>

      <main className="flex-1 px-4 pb-28">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 animate-fade-in">
            <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/30 rounded-2xl flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="font-semibold text-stone-700 dark:text-stone-300 mb-1">{error}</p>
            <p className="text-sm text-stone-400 dark:text-stone-500 text-center mb-6 max-w-xs">請確認網路連線後再試一次</p>
            <button
              onClick={retry}
              className="bg-gradient-to-r from-[#FF6B35] to-[#E23D28] text-white rounded-2xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
            >
              {t("retry")}
            </button>
          </div>
        ) : loading ? (
          <MenuLoader color="#FF6B35" />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 animate-fade-in">
            <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 dark:text-stone-600">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
              </svg>
            </div>
            <p className="font-semibold text-stone-700 dark:text-stone-300 mb-1">{search ? t("no_search_results") : t("no_items")}</p>
            <p className="text-sm text-stone-400 dark:text-stone-500 text-center">{search ? "試試其他關鍵字" : t("no_items_desc")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 stagger-children">
            {filtered.map((item) => (
              <MenuCard key={item.id} item={item} department="lunch" />
            ))}
          </div>
        )}
      </main>

      <CartBar department="lunch" onOpen={() => setShowCart(true)} />
      <DepartmentCartSheet open={showCart} department="lunch" onClose={() => setShowCart(false)} />
    </div>
  );
}
