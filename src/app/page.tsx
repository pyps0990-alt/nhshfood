"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrderLookup } from "@/components/OrderLookup";
import { useStudentAuth } from "@/lib/student-auth";
import { useT } from "@/lib/i18n";
import { IconSettings, IconWallet, IconLogOut, IconChevronRight, IconSchool, IconShoppingBag } from "@/components/Icons";
import { useCart } from "@/lib/cart";
import { getDeptConfig } from "@/lib/department";
import { prefetchMenu, preloadLocation } from "@/lib/hooks";
import { useExitAnimation } from "@/lib/useExitAnimation";
import { useEffect, useState, useCallback } from "react";
import { taipeiHour } from "@/lib/time";

export default function Home() {
  const router = useRouter();
  const { student, logout } = useStudentAuth();
  const t = useT();
  const cartItems = useCart((s) => s.items);
  const [balance, setBalance] = useState<number | null>(null);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const { mounted: deptPickerMounted, closing: deptPickerClosing } = useExitAnimation(showDeptPicker, 200);

  const fetchBalance = useCallback(async () => {
    if (!student) return;
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
    <div className="flex-1 flex flex-col">
      {/* Top bar: profile + quick actions */}
      <header className="lg-nav" data-scrolled="false">
        <div className="max-w-lg mx-auto h-[56px] px-4 flex items-center justify-between gap-2">
          {student ? (
            <Link href="/settings" className="flex items-center gap-2.5 min-w-0 lg-thin rounded-full pl-1 pr-3.5 py-1">
              <span className="w-8 h-8 rounded-full lg-tinted grid place-items-center text-[13px] font-bold shrink-0">
                {(name || "?").charAt(0)}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[13px] font-semibold lg-ink truncate">{name}</span>
                <span className="block text-[11px] lg-ink-3 truncate">{student.className} · {student.studentId}</span>
              </span>
            </Link>
          ) : (
            <Link href="/login" className="lg-btn lg-btn-sm lg-thin lg-ink">
              <IconSchool size={16} />
              {t("login_to_order")}
              <IconChevronRight size={14} className="lg-brand" />
            </Link>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            {student && (
              <Link href="/wallet" className="lg-btn lg-btn-sm lg-thin !text-amber-700 dark:!text-amber-300" aria-label="錢包">
                <IconWallet size={15} />
                <span className="tabular-nums font-bold">{balance !== null ? `$${balance}` : t("wallet")}</span>
              </Link>
            )}
            <Link href="/settings" aria-label={t("settings")} className="lg-btn lg-btn-icon lg-thin lg-ink-2 !w-9 !min-h-9">
              <IconSettings size={17} />
            </Link>
            {student && (
              <button onClick={logout} aria-label={t("logout")} className="lg-btn lg-btn-icon lg-thin lg-ink-2 !w-9 !min-h-9">
                <IconLogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-5 pt-4 pb-8 max-w-lg mx-auto w-full">
        <div className="lg-rise">
          <p className="text-[15px] font-semibold lg-ink-2">{name ? `${greeting}，${name}` : greeting}</p>
          <h1 className="lg-large-title lg-ink mt-0.5">{t("app_name")}</h1>
        </div>

        {/* Department tiles */}
        <div className="grid grid-cols-1 gap-3.5 mt-6">
          {([
            { key: "breakfast", color: "#E23D28", glow: "rgba(226,61,40,0.35)", icon: <path d="M17 11H3a1 1 0 01-1-1 8 8 0 018-8h8a1 1 0 011 1 8 8 0 01-2 5.3M21 10.5c.5.5 1 1.6 1 2.5a4 4 0 01-4 4H6M3 21h18M3 17h18" /> },
            { key: "lunch", color: "#FF6B35", glow: "rgba(255,107,53,0.35)", icon: <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /> },
          ] as const).map((d, i) => (
            <button
              key={d.key}
              onClick={() => handleDeptClick(d.key)}
              className="lg-card lg-hover lg-rise text-left overflow-hidden p-5 flex items-center gap-4 active:scale-[0.98]"
              style={{ animationDelay: `${0.06 + i * 0.06}s` }}
            >
              <span
                aria-hidden="true"
                className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-2xl"
                style={{ background: d.glow }}
              />
              <span className="relative w-16 h-16 rounded-[22px] grid place-items-center shrink-0 lg-thin" style={{ color: d.color }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d.icon}</svg>
              </span>
              <span className="relative flex-1 min-w-0">
                <span className="block text-[22px] font-bold tracking-tight" style={{ color: d.color }}>{t(d.key)}</span>
                <span className="block text-[13px] lg-ink-2 mt-0.5">{t(`${d.key}_hours`)}</span>
              </span>
              <span className="relative flex flex-col items-end gap-1.5">
                {!student && <span className="lg-status" data-s="picked_up">需登入</span>}
                <IconChevronRight size={20} className="lg-ink-3" />
              </span>
            </button>
          ))}
        </div>

        {/* Cart summary */}
        <button
          onClick={() => {
            if (cartCount === 0) return;
            if (!student) { router.push("/login"); return; }
            if (cartDepts.length > 1) { setShowDeptPicker(true); return; }
            router.push(`/${cartDepts[0]}?cart=1`);
          }}
          disabled={cartCount === 0}
          className={`mt-4 h-[58px] flex items-center justify-between rounded-full pl-2.5 pr-5 font-semibold transition-all duration-300 lg-rise ${
            cartCount > 0 ? "lg-tinted active:scale-[0.98]" : "lg-thin lg-ink-3 cursor-default"
          }`}
          style={{ animationDelay: "0.18s" }}
        >
          <span className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-full grid place-items-center ${cartCount > 0 ? "bg-white/22" : "bg-black/5 dark:bg-white/5"}`}>
              <IconShoppingBag size={18} />
            </span>
            <span>{t("cart")}</span>
            {cartDepts.length > 1 && (
              <span className="text-xs opacity-75">({cartDepts.map((d) => t(d === "breakfast" ? "breakfast" : "lunch")).join(" + ")})</span>
            )}
          </span>
          <span className="tabular-nums text-[17px] font-bold">{cartCount > 0 ? `${cartCount} 件` : "空的"}</span>
        </button>

        <div className="mt-auto pt-10">
          <OrderLookup />
        </div>

        <footer className="text-center text-[11px] lg-ink-3 pt-6 pb-2">
          &copy; {new Date().getFullYear()} {t("copyright")}
        </footer>
      </main>

      {deptPickerMounted && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowDeptPicker(false)}>
          <div className={`absolute inset-0 bg-black/25 ${deptPickerClosing ? "animate-backdrop-out" : "animate-backdrop-in"}`} />
          <div
            className={`relative w-full max-w-sm mx-3 mb-3 sm:mb-0 lg-thick rounded-[30px] overflow-hidden ${deptPickerClosing ? "animate-modal-out" : "animate-modal-in"}`}
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
                    className="w-full flex items-center justify-between gap-3 p-4 rounded-[20px] lg-thin active:scale-[0.98] transition-transform"
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
              <button onClick={() => setShowDeptPicker(false)} className="lg-btn w-full lg-thin lg-ink-2">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
