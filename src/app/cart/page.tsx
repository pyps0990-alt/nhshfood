"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useCart } from "@/lib/cart";
import { useStudentAuth } from "@/lib/student-auth";
import { getDeptConfig } from "@/lib/department";
import { BackButton } from "@/components/BackButton";
import { createOrderSecure, checkSchoolLocation } from "@/lib/hooks";
import { OrderAnimation } from "@/components/OrderAnimation";
import { useT } from "@/lib/i18n";

export default function UnifiedCartPage() {
  const router = useRouter();
  const allItems = useCart((s) => s.items);
  const updateQty = useCart((s) => s.updateQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const clearDept = useCart((s) => s.clearDept);
  const { student } = useStudentAuth();
  const t = useT();

  const departments = [...new Set(allItems.map((i) => i.department).filter(Boolean))] as string[];
  const grandTotal = allItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<{ dept: string; orderNumber: string; id: string }[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);

  // Date & time scheduling — independent per department
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [schedule, setSchedule] = useState<Record<string, { date: string; time: string }>>({});
  const [pickupSlots, setPickupSlots] = useState<Record<string, string[]>>({});
  const [payment, setPayment] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/settings/pickup-slots")
      .then((r) => r.json())
      .then((data) => setPickupSlots(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!student) return;
    fetch(`/api/wallet?studentId=${encodeURIComponent(student.studentId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setWalletBalance(data.balance); })
      .catch(() => {});
  }, [student]);

  // Ensure every department in the cart has a schedule/payment/note entry
  useEffect(() => {
    setSchedule((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const dept of departments) {
        if (!next[dept]) {
          next[dept] = { date: todayStr, time: "" };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setPayment((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const dept of departments) {
        if (!next[dept]) { next[dept] = "cash"; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [departments, todayStr]);

  function setDeptDate(dept: string, date: string) {
    setSchedule((prev) => ({ ...prev, [dept]: { date, time: isSlotPassed(dept, date, prev[dept]?.time || "") ? "" : (prev[dept]?.time || "") } }));
  }

  function setDeptTime(dept: string, time: string) {
    setSchedule((prev) => ({ ...prev, [dept]: { date: prev[dept]?.date || todayStr, time } }));
  }

  function setDeptPayment(dept: string, method: string) {
    setPayment((prev) => ({ ...prev, [dept]: method }));
  }

  function setDeptNote(dept: string, note: string) {
    setNotes((prev) => ({ ...prev, [dept]: note }));
  }

  const dateOptions = useMemo(() => {
    const dates: { value: string; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
      const label = i === 0 ? "今天" : i === 1 ? "明天" : `${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})`;
      dates.push({ value: val, label });
    }
    return dates;
  }, []);

  function isSlotPassed(dept: string, date: string, slot: string): boolean {
    if (!slot || slot === "盡快取餐") return false;
    if (date !== todayStr) return false;
    const match = slot.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return false;
    const now = new Date();
    return parseInt(match[1]) * 60 + parseInt(match[2]) <= now.getHours() * 60 + now.getMinutes();
  }

  const handleAnimDone = useCallback(() => {
    if (results.length === 1) {
      router.push(`/order/${results[0].id}`);
    } else {
      router.push("/");
    }
  }, [results, router]);

  if (allItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 animate-fade-in">
        <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-3xl flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 dark:text-stone-600">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-2">{t("cart_empty")}</h2>
        <p className="text-sm text-stone-400 dark:text-stone-500 text-center mb-8 max-w-xs">
          {t("cart_empty_desc")}
        </p>
        <Link href="/" className="bg-gradient-to-r from-[#E23D28] to-[#FF6B35] text-white rounded-2xl px-8 py-3.5 font-semibold shadow-lg hover:shadow-xl transition-all">
          {t("browse_menu")}
        </Link>
      </div>
    );
  }

  async function handleSubmit() {
    if (!student) { router.push("/login"); return; }
    setSubmitting(true);
    setError("");

    try {
      const loc = await checkSchoolLocation();
      if (!loc.ok) { setError(loc.error || "定位失敗"); setSubmitting(false); return; }

      const orderResults: { dept: string; orderNumber: string; id: string }[] = [];

      for (const dept of departments) {
        const deptItems = allItems.filter((i) => i.department === dept);
        const deptSchedule = schedule[dept];
        const result = await createOrderSecure({
          studentId: student.studentId,
          studentName: student.studentName || null,
          className: student.className || null,
          department: dept,
          note: notes[dept]?.trim() || null,
          paymentMethod: payment[dept] || "cash",
          pickupDate: deptSchedule?.date || null,
          pickupTime: deptSchedule?.time || null,
          items: deptItems.map((i) => ({
            menuItemId: i.menuItem.id,
            name: i.menuItem.name,
            quantity: i.quantity,
            price: i.menuItem.price,
          })),
        });
        orderResults.push({ dept, orderNumber: result.orderNumber, id: result.id });
      }

      clear();
      setResults(orderResults);
      setShowAnimation(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("order_error"));
      setSubmitting(false);
    }
  }

  if (showAnimation) {
    return (
      <OrderAnimation
        onDone={handleAnimDone}
        orderNumbers={results.map((r) => ({
          dept: r.dept,
          displayNum: r.orderNumber.length > 6 ? r.orderNumber.slice(-4) : r.orderNumber,
        }))}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-[#E23D28] to-[#FF6B35] text-white px-5 py-4 flex items-center gap-3 shadow-md">
        <BackButton href="/" variant="light" />
        <h1 className="text-lg font-bold tracking-tight">{t("cart")}</h1>
        <button onClick={() => { clear(); router.push("/"); }} className="ml-auto text-sm opacity-80 hover:opacity-100 transition-opacity">
          {t("clear_all")}
        </button>
      </header>

      <main className="flex-1 px-5 py-5 pb-40 space-y-5">
        {departments.map((dept) => {
          const cfg = getDeptConfig(dept);
          const isBreakfast = dept === "breakfast";
          const deptItems = allItems.filter((i) => i.department === dept);
          const deptTotal = deptItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
          const deptSlots = pickupSlots[dept] || [];
          const deptSchedule = schedule[dept] || { date: todayStr, time: "" };

          return (
            <div
              key={dept}
              className={`rounded-2xl border-2 overflow-hidden ${
                isBreakfast
                  ? "border-red-200/70 dark:border-red-800/40"
                  : "border-orange-200/70 dark:border-orange-800/40"
              }`}
            >
              {/* Department header */}
              <div className={`flex items-center justify-between px-4 py-3 ${cfg.headerBg} text-white`}>
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {isBreakfast
                      ? <><path d="M17 11H3a1 1 0 01-1-1 8 8 0 018-8h8a1 1 0 011 1 8 8 0 01-2 5.3"/><path d="M21 10.5c.5.5 1 1.6 1 2.5a4 4 0 01-4 4H6"/><path d="M3 21h18"/><path d="M3 17h18"/></>
                      : <><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></>
                    }
                  </svg>
                  <h2 className="font-bold text-base">{cfg.label}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">${deptTotal}</span>
                  <button onClick={() => clearDept(dept)} className="text-xs text-white/80 hover:text-white transition-colors">{t("clear")}</button>
                </div>
              </div>

              <div className={`p-4 space-y-4 ${isBreakfast ? "bg-red-50/40 dark:bg-red-950/10" : "bg-orange-50/40 dark:bg-orange-950/10"}`}>
                {/* Items */}
                <div className="space-y-2 stagger-children">
                  {deptItems.map((ci) => (
                    <div key={ci.menuItem.id} className="card-premium p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{ci.menuItem.name}</p>
                        <p className="text-xs text-dim mt-0.5">${ci.menuItem.price} × {ci.quantity} = <span className="text-value">${ci.menuItem.price * ci.quantity}</span></p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQty(ci.menuItem.id, ci.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center text-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                        >−</button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={999}
                          value={ci.quantity}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!isNaN(v) && v >= 1 && v <= 999) updateQty(ci.menuItem.id, v);
                          }}
                          className="w-10 text-center font-bold text-sm text-stone-800 dark:text-stone-200 bg-transparent border-b-2 border-stone-200 dark:border-stone-600 focus:border-[#E23D28] outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => updateQty(ci.menuItem.id, ci.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center text-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                        >+</button>
                      </div>
                      <button onClick={() => remove(ci.menuItem.id)} className="text-red-400 text-xs hover:text-red-500 transition-colors">{t("delete")}</button>
                    </div>
                  ))}
                </div>

                {/* Per-department date & time scheduling */}
                <div className="space-y-2.5">
                  <h3 className={`font-bold text-xs flex items-center gap-1.5 ${cfg.btnText}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {cfg.label}取餐日期與時段
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {dateOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDeptDate(dept, opt.value)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                          deptSchedule.date === opt.value
                            ? `${cfg.selectedBtn} shadow-md`
                            : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 bg-white dark:bg-stone-900"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deptSlots.map((slot) => {
                      const passed = isSlotPassed(dept, deptSchedule.date, slot);
                      return (
                        <button
                          key={slot}
                          disabled={passed}
                          onClick={() => setDeptTime(dept, slot)}
                          className={`px-3 py-1.5 rounded-lg text-xs border transition-all duration-200 ${
                            passed
                              ? "border-stone-100 dark:border-stone-800 text-stone-300 dark:text-stone-600 bg-stone-50 dark:bg-stone-900 cursor-not-allowed line-through"
                              : deptSchedule.time === slot
                              ? `${cfg.selectedBtn} shadow-md`
                              : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 bg-white dark:bg-stone-900"
                          }`}
                        >{slot}</button>
                      );
                    })}
                    {deptSlots.length === 0 && (
                      <p className="text-xs text-stone-400 dark:text-stone-500">尚無可選時段</p>
                    )}
                  </div>
                  {deptSchedule.date === todayStr && deptSlots.some(s => isSlotPassed(dept, deptSchedule.date, s)) && (
                    <p className="text-[11px] text-stone-400 dark:text-stone-500 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      已過時段無法選取
                    </p>
                  )}
                </div>

                {/* Per-department payment method */}
                <div className="space-y-2.5">
                  <h3 className={`font-bold text-xs flex items-center gap-1.5 ${cfg.btnText}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    {t("payment_method")}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "cash", label: t("cash"), enabled: true, sub: null as string | null },
                      { key: "wallet", label: t("wallet_pay"), enabled: walletBalance !== null && walletBalance >= deptTotal, sub: walletBalance !== null ? `${t("balance")} $${walletBalance}` : null },
                      { key: "easycard", label: t("easycard"), enabled: false, sub: null as string | null },
                      { key: "linepay", label: "LINE Pay", enabled: false, sub: null as string | null },
                    ]).map((pm) => (
                      <button
                        key={pm.key} type="button" disabled={!pm.enabled}
                        onClick={() => pm.enabled && setDeptPayment(dept, pm.key)}
                        className={`relative px-3 py-2.5 rounded-lg text-xs border transition-all duration-200 ${
                          !pm.enabled
                            ? "border-stone-100 dark:border-stone-800 text-stone-300 dark:text-stone-600 bg-stone-50 dark:bg-stone-900 cursor-not-allowed"
                            : (payment[dept] || "cash") === pm.key
                            ? `${cfg.selectedBtn} shadow-md`
                            : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 bg-white dark:bg-stone-900"
                        }`}
                      >
                        <span>{pm.label}</span>
                        {pm.sub && <span className="block text-[10px] opacity-70 mt-0.5">{pm.sub}</span>}
                        {!pm.enabled && pm.key !== "wallet" && (
                          <span className="absolute -top-2 -right-2 bg-stone-400 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">
                            {t("coming_soon")}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Per-department note */}
                <div className="space-y-2">
                  <h3 className={`font-bold text-xs flex items-center gap-1.5 ${cfg.btnText}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    {t("note")}
                  </h3>
                  <textarea
                    value={notes[dept] || ""}
                    onChange={(e) => setDeptNote(dept, e.target.value)}
                    placeholder={t("note_placeholder")}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#E23D28]/20 focus:border-[#E23D28] transition-all"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
      </main>

      <div className="fixed bottom-0 inset-x-0 p-5 glass dark:bg-stone-900/85 border-t border-stone-200/50 dark:border-stone-800 space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-label text-sm">{t("total")}</span>
          <span className="text-value text-2xl">${grandTotal}</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || !student}
          className="w-full bg-gradient-to-r from-[#E23D28] to-[#FF6B35] text-white rounded-2xl px-4 py-3.5 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {submitting ? t("submitting") : `${t("submit_order")}（$${grandTotal}）`}
        </button>
      </div>
    </div>
  );
}
