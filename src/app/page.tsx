"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TabBar } from "@/components/glass/TabBar";
import { useStudentAuth } from "@/lib/student-auth";
import { useT } from "@/lib/i18n";
import { IconWallet, IconChevronRight, IconSchool, IconShoppingBag } from "@/components/Icons";

const ACTIVE_LABEL: Record<string, string> = { awaiting_payment: "等待付款", pending: "店家確認中", confirmed: "準備中", ready: "可以取餐了" };
import { useCart } from "@/lib/cart";
import { getDeptConfig } from "@/lib/department";
import { prefetchMenu, preloadLocation } from "@/lib/hooks";
import { useExitAnimation } from "@/lib/useExitAnimation";
import { useEffect, useState, useCallback } from "react";
import { taipeiHour } from "@/lib/time";

export default function Home() {
  const router = useRouter();
  const { student } = useStudentAuth();
  const [activeOrders, setActiveOrders] = useState<{ id: string; orderNumber: string; status: string }[]>([]);
  const t = useT();
  const cartItems = useCart((s) => s.items);
  const [balance, setBalance] = useState<number | null>(null);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const { mounted: deptPickerMounted, closing: deptPickerClosing } = useExitAnimation(showDeptPicker, 200);

  const fetchBalance = useCallback(async () => {
    if (!student) return;
    fetch("/api/orders/mine", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; orderNumber: string; status: string }[]) =>
        setActiveOrders(list.filter((o) => o.status in ACTIVE_LABEL)))
      .catch(() => {});
    try {
      const res = await fetch(`/api/wallet?studentId=${encodeURIComponent(student.studentId)}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch {}
  }, [student]);

  useEffect(() => {
    if (!localStorage.getItem("nhsh_onboarded")) {
      router.replace("/onboarding");
      return;
    }
    prefetchMenu("breakfast");
    prefetchMenu("lunch");
    preloadLocation();
    fetchBalance();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchBalance();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router, fetchBalance]);

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartDepts = [...new Set(cartItems.map((i) => i.department).filter(Boolean))] as string[];

  function handleDeptClick(dept: string) {
    if (!student) { router.push("/login"); return; }
    router.push(`/${dept}`);
  }

  const hour = taipeiHour(new Date());
  const greeting = hour < 11 ? "早安" : hour < 14 ? "午安" : hour < 18 ? "下午好" : "晚安";
  const name = student ? student.displayName || student.studentName : null;

  return (
    <div className="flex-1 flex flex-col has-tabbar">
      {/* Top bar: glass controls float over content (no bar background at rest) */}
      <header className="lg-nav" data-scrolled="false">
        <div className="max-w-lg mx-auto h-[56px] px-4 flex items-center justify-between gap-2">
          {student ? (
            <Link href="/profile" aria-label="個人資料" className="lg-glass lg-glass-press w-11 h-11 rounded-full grid place-items-center shrink-0">
              <span className="w-9 h-9 rounded-full lg-tinted grid place-items-center text-[15px] font-semibold">{(name || "?").charAt(0)}</span>
            </Link>
          ) : (
            <Link href="/login" className="lg-btn lg-btn-sm lg-glass lg-ink">
              <IconSchool size={16} />
              {t("login_to_order")}
            </Link>
          )}
          {student && (
            <Link href="/wallet" className="lg-btn lg-btn-sm lg-glass lg-ink" aria-label={`錢包餘額 ${balance ?? ""}`}>
              <IconWallet size={16} className="lg-brand" />
              <span className="tabular-nums">{balance !== null ? `$${balance}` : t("wallet")}</span>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-1 max-w-lg mx-auto w-full">
        <div className="px-1 lg-rise">
          <p className="ios-subhead lg-ink-2">{name ? `${greeting}，${name}` : greeting}</p>
          <h1 className="ios-large-title lg-ink">{t("app_name")}</h1>
        </div>

        {activeOrders.length > 0 && (
          <Link href={activeOrders.length === 1 ? `/order/${activeOrders[0].id}` : "/orders"} className="ios-card mt-5 lg-row active:scale-[0.985] transition-transform lg-rise">
            <span className="w-10 h-10 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(255,149,0,.15)", color: "var(--sys-orange)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block ios-headline lg-ink">
                {activeOrders.length === 1 ? `訂單 #${String(activeOrders[0].orderNumber).slice(-4)}` : `${activeOrders.length} 筆進行中的訂單`}
              </span>
              <span className="block ios-footnote lg-ink-2">
                {activeOrders.length === 1 ? ACTIVE_LABEL[activeOrders[0].status] : "點擊查看狀態"}
              </span>
            </span>
            <IconChevronRight size={16} className="lg-ink-3" />
          </Link>
        )}

        <p className="ios-section-header mt-6">點餐</p>
        <div className="lg-list">
          {([
            { key: "breakfast", color: "#E23D28", icon: <path d="M17 11H3a1 1 0 01-1-1 8 8 0 018-8h8a1 1 0 011 1 8 8 0 01-2 5.3M21 10.5c.5.5 1 1.6 1 2.5a4 4 0 01-4 4H6M3 21h18M3 17h18" /> },
            { key: "lunch", color: "#F2602A", icon: <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /> },
          ] as const).map((d) => (
            <button key={d.key} onClick={() => handleDeptClick(d.key)} className="lg-row w-full text-left !min-h-[76px] active:bg-[var(--fill-4)] transition-colors">
              <span className="w-12 h-12 rounded-[14px] grid place-items-center shrink-0 text-white" style={{ background: d.color }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{d.icon}</svg>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block ios-title3 lg-ink">{t(d.key)}</span>
                <span className="block ios-subhead lg-ink-2">{t(`${d.key}_hours`)}</span>
              </span>
              {!student && <span className="ios-footnote lg-ink-3">需登入</span>}
              <IconChevronRight size={16} className="lg-ink-3" />
            </button>
          ))}
        </div>

        {cartCount > 0 && (
          <>
            <p className="ios-section-header mt-6">購物車</p>
            <button
              onClick={() => {
                if (!student) { router.push("/login"); return; }
                if (cartDepts.length > 1) { setShowDeptPicker(true); return; }
                router.push(`/${cartDepts[0]}?cart=1`);
              }}
              className="ios-card lg-row w-full text-left active:scale-[0.985] transition-transform"
            >
              <span className="w-10 h-10 rounded-full grid place-items-center shrink-0 lg-thin lg-brand"><IconShoppingBag size={19} /></span>
              <span className="flex-1 min-w-0">
                <span className="block ios-headline lg-ink">{cartCount} 件待結帳</span>
                <span className="block ios-footnote lg-ink-2">{cartDepts.map((d) => t(d === "breakfast" ? "breakfast" : "lunch")).join("、")}</span>
              </span>
              <IconChevronRight size={16} className="lg-ink-3" />
            </button>
          </>
        )}

        <footer className="text-center ios-caption lg-ink-3 pt-10 pb-4">
          &copy; {new Date().getFullYear()} {t("copyright")}
        </footer>
      </main>

      <TabBar />

      {deptPickerMounted && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowDeptPicker(false)}>
          <div className={`absolute inset-0 bg-black/20 ${deptPickerClosing ? "animate-backdrop-out" : "animate-backdrop-in"}`} />
          <div
            className={`relative w-full max-w-sm mx-2 mb-2 sm:mb-0 lg-glass rounded-[var(--r-sheet)] overflow-hidden ${deptPickerClosing ? "animate-modal-out" : "lg-materialize"}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="選擇要查看的購物車"
          >
            <div className="px-5 pt-5 pb-2">
              <h3 className="text-[17px] font-bold lg-ink">選擇要查看的購物車</h3>
              <p className="text-[13px] lg-ink-3 mt-1">兩個部門都有品項，請選擇一個</p>
            </div>
            <div className="p-3 space-y-2">
              {cartDepts.map((dept) => {
                const cfg = getDeptConfig(dept);
                const deptCount = cartItems.filter((i) => i.department === dept).reduce((s, i) => s + i.quantity, 0);
                const deptTotal = cartItems.filter((i) => i.department === dept).reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
                return (
                  <button
                    key={dept}
                    onClick={() => { setShowDeptPicker(false); router.push(`/${dept}?cart=1`); }}
                    className="w-full flex items-center justify-between gap-3 p-4 rounded-[24px] bg-[var(--sys-bg-2)] active:scale-[0.98] transition-transform"
                  >
                    <span className={`font-bold ${cfg.btnText}`}>{cfg.label}</span>
                    <span className="flex items-center gap-2 text-sm lg-ink-2">
                      <span className="tabular-nums">{deptCount} 件・${deptTotal}</span>
                      <IconChevronRight size={14} className={cfg.btnText} />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="p-3 pt-0">
              <button onClick={() => setShowDeptPicker(false)} className="lg-btn lg-btn-lg w-full bg-[var(--sys-bg-2)] lg-ink">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
