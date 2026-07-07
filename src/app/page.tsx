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

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-20 glass dark:bg-stone-900/85 border-b border-stone-200/50 dark:border-stone-800 px-4 py-2.5">
        {student ? (
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <Link href="/settings" className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-[#E23D28] to-[#FF6B35] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(student.displayName || student.studentName).charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-800 dark:text-stone-200 truncate">{student.displayName || student.studentName}</p>
                <p className="text-[11px] text-stone-400 truncate">{student.className} · {student.studentId}</p>
              </div>
            </Link>
            <div className="flex items-center gap-1 shrink-0">
              <Link href="/wallet" className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                <IconWallet size={14} />
                {balance !== null ? (
                  <span className="font-mono font-bold">${balance}</span>
                ) : (
                  <span>{t("wallet")}</span>
                )}
              </Link>
              <Link href="/settings" className="p-2 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <IconSettings size={16} />
              </Link>
              <button onClick={logout} className="p-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <IconLogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <Link href="/login" className="flex items-center gap-2">
              <IconSchool className="text-stone-500" />
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">{t("login_to_order")}</span>
              <IconChevronRight className="text-[#E23D28]" />
            </Link>
            <Link href="/settings" className="p-2 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              <IconSettings size={16} />
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col px-6 py-8 max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-black text-value mb-6">{t("app_name")}</h1>

        {/* Department buttons — vertical stack, large cards */}
        <div className="flex flex-col gap-3">
          <button onClick={() => handleDeptClick("breakfast")}
            className="relative flex flex-col items-center gap-3 p-8 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20 border border-red-200/60 dark:border-red-800/40 rounded-2xl hover:border-red-300 dark:hover:border-red-700 active:scale-[0.98] transition-all duration-150">
            {!student && (
              <span className="absolute top-3 right-3 text-[10px] font-bold bg-stone-700 dark:bg-stone-600 text-white px-2 py-0.5 rounded-md">需登入</span>
            )}
            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#E23D28" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 11H3a1 1 0 01-1-1 8 8 0 018-8h8a1 1 0 011 1 8 8 0 01-2 5.3"/><path d="M21 10.5c.5.5 1 1.6 1 2.5a4 4 0 01-4 4H6"/><path d="M3 21h18"/><path d="M3 17h18"/>
            </svg>
            <div className="text-center">
              <span className="text-xl font-bold text-[#E23D28]">{t("breakfast")}</span>
              <p className="text-sm text-stone-400 dark:text-stone-500 mt-0.5">{t("breakfast_hours")}</p>
            </div>
          </button>

          <button onClick={() => handleDeptClick("lunch")}
            className="relative flex flex-col items-center gap-3 p-8 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200/60 dark:border-orange-800/40 rounded-2xl hover:border-orange-300 dark:hover:border-orange-700 active:scale-[0.98] transition-all duration-150">
            {!student && (
              <span className="absolute top-3 right-3 text-[10px] font-bold bg-stone-700 dark:bg-stone-600 text-white px-2 py-0.5 rounded-md">需登入</span>
            )}
            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
            </svg>
            <div className="text-center">
              <span className="text-xl font-bold text-[#FF6B35]">{t("lunch")}</span>
              <p className="text-sm text-stone-400 dark:text-stone-500 mt-0.5">{t("lunch_hours")}</p>
            </div>
          </button>
        </div>

        {/* Cart — always visible */}
        <button
          onClick={() => {
            if (cartCount === 0) return;
            if (!student) { router.push("/login"); return; }
            if (cartDepts.length > 1) { setShowDeptPicker(true); return; }
            router.push(`/${cartDepts[0]}?cart=1`);
          }}
          className={`mt-4 flex items-center justify-between rounded-2xl px-5 py-3.5 font-semibold shadow-md active:scale-[0.98] transition-all duration-150 ${
            cartCount > 0
              ? "bg-gradient-to-r from-[#E23D28] to-[#FF6B35] text-white"
              : "bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 shadow-none cursor-default"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <IconShoppingBag size={16} />
            <span>{t("cart")}</span>
            {cartDepts.length > 1 && (
              <span className={cartCount > 0 ? "text-white/70 text-xs" : "text-stone-400 text-xs"}>
                ({cartDepts.map(d => t(d === "breakfast" ? "breakfast" : "lunch")).join(" + ")})
              </span>
            )}
          </span>
          <span className={`rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold ${
            cartCount > 0 ? "bg-white/20" : "bg-stone-200 dark:bg-stone-700"
          }`}>{cartCount}</span>
        </button>

        {/* Order lookup — secondary action, pushed down */}
        <div className="mt-auto pt-8">
          <OrderLookup />
        </div>

        <footer className="text-center text-xs text-stone-400 dark:text-stone-600 pt-6 pb-2">
          &copy; 2025 {t("copyright")}
        </footer>
      </main>

      {deptPickerMounted && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowDeptPicker(false)}>
          <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${deptPickerClosing ? "animate-backdrop-out" : "animate-backdrop-in"}`} />
          <div
            className={`relative w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden ${deptPickerClosing ? "animate-modal-out" : "animate-modal-in"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 pb-2">
              <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">選擇要查看的購物車</h3>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">兩個部門都有品項，請選擇一個</p>
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
                    className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl border-2 transition-all duration-150 active:scale-[0.98] ${
                      dept === "breakfast"
                        ? "border-red-200/70 dark:border-red-800/40 bg-red-50/60 dark:bg-red-950/20 hover:border-red-300 dark:hover:border-red-700"
                        : "border-orange-200/70 dark:border-orange-800/40 bg-orange-50/60 dark:bg-orange-950/20 hover:border-orange-300 dark:hover:border-orange-700"
                    }`}
                  >
                    <span className={`font-bold ${cfg.btnText}`}>{cfg.label}</span>
                    <span className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                      <span>{deptCount} 件・${deptTotal}</span>
                      <IconChevronRight size={14} className={cfg.btnText} />
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowDeptPicker(false)}
              className="w-full py-3.5 text-stone-500 dark:text-stone-400 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors border-t border-stone-100 dark:border-stone-800"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
