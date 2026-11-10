"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MenuCard } from "@/components/MenuCard";
import { CartBar } from "@/components/CartBar";
import { DepartmentCartSheet } from "@/components/DepartmentCartSheet";
import { MenuLoader } from "@/components/MenuLoader";
import { NavBar } from "@/components/glass/NavBar";
import { useMenuItems } from "@/lib/hooks";
import { useT, useMenuTranslate } from "@/lib/i18n";
import { taipeiHour } from "@/lib/time";

type Dept = "breakfast" | "lunch";

const COLOR: Record<Dept, string> = { breakfast: "#E23D28", lunch: "#FF6B35" };

function isOpenNow(dept: Dept) {
  if (dept === "breakfast") return true;
  const h = taipeiHour(new Date());
  return h >= 11 && h < 13;
}

export function DepartmentMenuPage({ department }: { department: Dept }) {
  const { items, loading, error, retry } = useMenuItems(department);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(() => isOpenNow(department));
  const searchParams = useSearchParams();
  const [showCart, setShowCart] = useState(() => searchParams.get("cart") === "1");
  const t = useT();
  const tMenu = useMenuTranslate();

  useEffect(() => {
    const timer = setInterval(() => setOpen(isOpenNow(department)), 30000);
    return () => clearInterval(timer);
  }, [department]);

  const categories = useMemo(() => ["all", ...new Set(items.map((i) => i.category))], [items]);
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
      <NavBar
        large
        backHref="/"
        title={t(department)}
        subtitle={t(`${department}_hours`)}
      />

      {!open && (
        <div className="px-4 pt-1">
          <div className="lg-card px-4 py-3.5 flex items-start gap-3 lg-rise">
            <span className="mt-0.5 w-8 h-8 rounded-full grid place-items-center bg-amber-500/15 text-amber-600 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            </span>
            <div>
              <p className="font-semibold lg-ink">{t("not_serving")}</p>
              <p className="text-[13px] mt-0.5 lg-ink-2">{t("not_serving_desc")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search + categories */}
      <div className="relative z-10 px-4 pt-2 pb-2 max-w-5xl mx-auto w-full">
        <div className="relative">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 lg-ink-3 pointer-events-none" aria-hidden="true">
            <circle cx="11" cy="11" r="7.5" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_menu")}
            aria-label={t("search_menu")}
            className="lg-field lg-pill !pl-10 !pr-10 !min-h-[42px] text-[15px]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="清除搜尋"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full bg-black/10 dark:bg-white/15 lg-ink-2"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="flex gap-2 pt-2.5 overflow-x-auto scrollbar-none -mx-4 px-4">
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c} className="lg-chip">
              {c === "all" ? t("all") : tMenu(c)}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-4 pt-2 pb-32 max-w-5xl mx-auto w-full">
        {error ? (
          <EmptyState
            tone={COLOR[department]}
            title={error}
            body="請確認網路連線後再試一次"
            action={<button onClick={retry} className="lg-btn lg-tinted" data-dept={department}>{t("retry")}</button>}
          />
        ) : loading ? (
          <MenuLoader color={COLOR[department]} />
        ) : filtered.length === 0 ? (
          <EmptyState
            tone="#a8a29e"
            title={search ? t("no_search_results") : t("no_items")}
            body={search ? "試試其他關鍵字" : t("no_items_desc")}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 stagger-children">
            {filtered.map((item) => (
              <MenuCard key={item.id} item={item} department={department} />
            ))}
          </div>
        )}
      </main>

      <CartBar department={department} onOpen={() => setShowCart(true)} />
      <DepartmentCartSheet open={showCart} department={department} onClose={() => setShowCart(false)} />
    </div>
  );
}

function EmptyState({ tone, title, body, action }: { tone: string; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 lg-rise">
      <div className="lg-card w-16 h-16 !rounded-[22px] grid place-items-center mb-4" style={{ color: tone }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
        </svg>
      </div>
      <p className="font-semibold lg-ink mb-1 text-center">{title}</p>
      <p className="text-sm lg-ink-3 text-center mb-6 max-w-xs">{body}</p>
      {action}
    </div>
  );
}
