"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MenuCard } from "@/components/MenuCard";
import { MenuToolbar } from "@/components/MenuToolbar";
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
          <div className="ios-card px-4 py-3.5 flex items-start gap-3 lg-rise">
            <span className="mt-0.5 w-8 h-8 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(255,149,0,.15)", color: "var(--sys-orange)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            </span>
            <div>
              <p className="font-semibold lg-ink">{t("not_serving")}</p>
              <p className="text-[13px] mt-0.5 lg-ink-2">{t("not_serving_desc")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Category chips */}
      <div className="flex gap-2 px-4 pt-1 pb-3 overflow-x-auto scrollbar-none max-w-5xl mx-auto w-full" role="toolbar" aria-label="分類">
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c} className="lg-chip shrink-0">
            {c === "all" ? t("all") : tMenu(c)}
          </button>
        ))}
      </div>
      {search && (
        <p className="px-5 pb-2 ios-footnote lg-ink-2 max-w-5xl mx-auto w-full">「{search}」的搜尋結果：{filtered.length} 項</p>
      )}

      <main className="flex-1 px-4 pb-32 max-w-5xl mx-auto w-full">
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

      <MenuToolbar department={department} onOpenCart={() => setShowCart(true)} search={search} onSearch={setSearch} />
      <DepartmentCartSheet open={showCart} department={department} onClose={() => setShowCart(false)} />
    </div>
  );
}

function EmptyState({ tone, title, body, action }: { tone: string; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 lg-rise">
      <div className="w-16 h-16 rounded-[18px] grid place-items-center mb-4 bg-[var(--fill-3)]" style={{ color: tone }}>
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
