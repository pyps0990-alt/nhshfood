"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useCart } from "@/lib/cart";
import { useStudentAuth } from "@/lib/student-auth";
import { getDeptConfig } from "@/lib/department";
import { createOrderSecure, checkSchoolLocation } from "@/lib/hooks";
import { OrderAnimation } from "@/components/OrderAnimation";
import { useT } from "@/lib/i18n";
import { PaymentMethodPicker, type PayMethod } from "@/components/glass/PaymentMethodPicker";
import { NavBar } from "@/components/glass/NavBar";

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
  const [payment, setPayment] = useState<Record<string, PayMethod>>({});
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

  function setDeptPayment(dept: string, method: PayMethod) {
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
        <div className="lg-card w-20 h-20 !rounded-[26px] grid place-items-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 dark:text-stone-600">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold lg-ink mb-2">{t("cart_empty")}</h2>
        <p className="text-sm text-stone-400 dark:text-stone-500 text-center mb-8 max-w-xs">
          {t("cart_empty_desc")}
        </p>
        <Link href="/" className="lg-btn lg-btn-lg lg-tinted">
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
      let redirectUrl: string | null = null;

      // Place offline-paid orders first; an online-payment order (max one)
      // goes last because it navigates away to ECPay.
      const ordered = [...departments].sort((a, b) => Number(payment[a] === "ecpay") - Number(payment[b] === "ecpay"));
      for (const dept of ordered) {
        const deptItems = allItems.filter((i) => i.department === dept);
        const deptSchedule = schedule[dept];
        const result = await createOrderSecure({
          department: dept,
          note: notes[dept]?.trim() || null,
          paymentMethod: payment[dept] || "cash",
          pickupDate: deptSchedule?.date || null,
          pickupTime: deptSchedule?.time || null,
          coords: loc.coords || null,
          items: deptItems.map((i) => ({
            menuItemId: i.menuItem.id,
            name: i.menuItem.name,
            quantity: i.quantity,
            price: i.menuItem.price,
          })),
        });
        clearDept(dept);
        orderResults.push({ dept, orderNumber: result.orderNumber, id: result.id });
        if (result.redirectUrl) redirectUrl = result.redirectUrl;
      }

      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
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
      <NavBar
        large
        backHref="/"
        title={t("cart")}
        right={
          <button onClick={() => { clear(); router.push("/"); }} className="lg-btn lg-btn-sm lg-thin text-red-500">
            {t("clear_all")}
          </button>
        }
      />

      <main className="flex-1 px-4 pt-2 pb-48 space-y-5 max-w-2xl mx-auto w-full">
        {departments.map((dept) => {
          const cfg = getDeptConfig(dept);
          const isBreakfast = dept === "breakfast";
          const deptItems = allItems.filter((i) => i.department === dept);
          const deptTotal = deptItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
          const deptSlots = pickupSlots[dept] || [];
          const deptSchedule = schedule[dept] || { date: todayStr, time: "" };

          return (
            <section key={dept} className="lg-card overflow-hidden lg-rise">
              {/* Department header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-1">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isBreakfast ? "#E23D28" : "#FF6B35"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {isBreakfast
                      ? <><path d="M17 11H3a1 1 0 01-1-1 8 8 0 018-8h8a1 1 0 011 1 8 8 0 01-2 5.3"/><path d="M21 10.5c.5.5 1 1.6 1 2.5a4 4 0 01-4 4H6"/><path d="M3 21h18"/><path d="M3 17h18"/></>
                      : <><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></>
                    }
                  </svg>
                  <h2 className={`font-bold text-[19px] tracking-tight ${cfg.btnText}`}>{cfg.label}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[17px] font-bold lg-ink tabular-nums">${deptTotal}</span>
                  <button onClick={() => clearDept(dept)} className="lg-btn lg-btn-sm lg-thin lg-ink-3">{t("clear")}</button>
                </div>
              </div>

              <div className="p-4 pt-3 space-y-5">
                {/* Items */}
                <div className="lg-list lg-surface">
                  {deptItems.map((ci) => (
                    <div key={ci.menuItem.id} className="lg-row">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[15px] truncate lg-ink">{ci.menuItem.name}</p>
                        <p className="text-[12px] lg-ink-3 mt-0.5 tabular-nums">${ci.menuItem.price} × {ci.quantity}</p>
                      </div>
                      <span className="font-bold text-[15px] lg-ink tabular-nums w-14 text-right">${ci.menuItem.price * ci.quantity}</span>
                      <div className="flex items-center gap-0.5 lg-thin rounded-full p-0.5">
                        <button
                          onClick={() => (ci.quantity <= 1 ? remove(ci.menuItem.id) : updateQty(ci.menuItem.id, ci.quantity - 1))}
                          aria-label={ci.quantity <= 1 ? `${t("delete")} ${ci.menuItem.name}` : "減少"}
                          className="w-8 h-8 rounded-full grid place-items-center lg-ink-2 active:scale-90 transition-transform"
                        >
                          {ci.quantity <= 1 ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-red-500"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /></svg>
                          )}
                        </button>
                        <span className="min-w-6 text-center font-bold text-[15px] lg-ink tabular-nums">{ci.quantity}</span>
                        <button
                          onClick={() => updateQty(ci.menuItem.id, Math.min(20, ci.quantity + 1))}
                          aria-label="增加"
                          data-dept={dept}
                          className="w-8 h-8 rounded-full grid place-items-center lg-tinted active:scale-90 transition-transform"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Per-department date & time scheduling */}
                <div className="space-y-2.5">
                  <h3 className="ios-footnote flex items-center gap-1.5 lg-ink-2 px-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {cfg.label}取餐日期與時段
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {dateOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDeptDate(dept, opt.value)}
                        aria-pressed={deptSchedule.date === opt.value}
                        className="lg-chip flex-shrink-0"
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
                          aria-pressed={deptSchedule.time === slot}
                          className={`lg-chip tabular-nums ${passed ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                        >{slot}</button>
                      );
                    })}
                    {deptSlots.length === 0 && (
                      <p className="text-xs lg-ink-3 px-1">尚無可選時段</p>
                    )}
                  </div>
                  {deptSchedule.date === todayStr && deptSlots.some(s => isSlotPassed(dept, deptSchedule.date, s)) && (
                    <p className="text-[11px] lg-ink-3 flex items-center gap-1 px-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      已過時段無法選取
                    </p>
                  )}
                </div>

                {/* Per-department payment method */}
                <div className="space-y-2.5">
                  <h3 className="ios-footnote flex items-center gap-1.5 lg-ink-2 px-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    {t("payment_method")}
                  </h3>
                  <PaymentMethodPicker
                    value={payment[dept] || "cash"}
                    onChange={(m) => setDeptPayment(dept, m)}
                    total={deptTotal}
                    walletBalance={walletBalance}
                    ecpayAllowed={!departments.some((d) => d !== dept && payment[d] === "ecpay")}
                    ecpayHint="另一部門已選線上付款"
                  />
                </div>

                {/* Per-department note */}
                <div className="space-y-2">
                  <h3 className="ios-footnote flex items-center gap-1.5 lg-ink-2 px-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    {t("note")}
                  </h3>
                  <textarea
                    value={notes[dept] || ""}
                    onChange={(e) => setDeptNote(dept, e.target.value)}
                    placeholder={t("note_placeholder")}
                    rows={2}
                    maxLength={200}
                    className="lg-field !text-[15px] resize-none"
                  />
                </div>
              </div>
            </section>
          );
        })}

        {error && <p className="text-red-500 text-sm font-medium px-1" role="alert">{error}</p>}
      </main>

      <div className="lg-float">
        <div className="lg-glass rounded-full p-2 pl-6 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] lg-ink-3">{t("total")}</p>
            <p className="text-[24px] font-bold lg-ink tabular-nums leading-none mt-0.5" style={{ fontFamily: "var(--font-rounded)" }}>${grandTotal}</p>
          </div>
          <button onClick={handleSubmit} disabled={submitting || !student} className="lg-btn lg-btn-lg lg-glass-prominent shrink-0">
            {submitting ? t("submitting") : departments.some((d) => payment[d] === "ecpay") ? "送出並付款" : t("submit_order")}
          </button>
        </div>
      </div>
    </div>
  );
}
