"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useCart } from "@/lib/cart";
import { useStudentAuth } from "@/lib/student-auth";
import { getDeptConfig } from "@/lib/department";
import { createOrderSecure, checkSchoolLocation } from "@/lib/hooks";
import { OrderAnimation } from "@/components/OrderAnimation";
import { useExitAnimation } from "@/lib/useExitAnimation";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/haptic";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  open: boolean;
  department: string;
  onClose: () => void;
}

export function DepartmentCartSheet({ open, department, onClose }: Props) {
  const router = useRouter();
  const { mounted, closing } = useExitAnimation(open, 250);
  // Swipe-to-dismiss: drag from the header to pull the sheet down; releasing
  // past the threshold closes; otherwise it eases back.
  const [dragY, setDragY] = useState(0);
  const [snappingBack, setSnappingBack] = useState(false);
  const [flingOut, setFlingOut] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const DISMISS_THRESHOLD = 100;

  function handleTouchStart(e: React.TouchEvent) {
    if (submitting) return;
    dragStartY.current = e.touches[0].clientY;
    setSnappingBack(false);
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    setDragY(Math.max(0, dy));
  }
  function handleTouchEnd() {
    if (dragStartY.current === null) return;
    dragStartY.current = null;
    if (dragY > DISMISS_THRESHOLD) {
      // Continue the drag with a smooth outward transition, then unmount —
      // avoids the "snap-up then slide-down" flash from resetting dragY to 0
      // before the modal-out keyframe starts.
      haptic(15);
      setFlingOut(true);
      setTimeout(() => {
        onClose();
        setDragY(0);
        setFlingOut(false);
      }, 220);
    } else {
      setSnappingBack(true);
      setDragY(0);
      setTimeout(() => setSnappingBack(false), 250);
    }
  }
  const allItems = useCart((s) => s.items);
  const updateQty = useCart((s) => s.updateQty);
  const remove = useCart((s) => s.remove);
  const clearDept = useCart((s) => s.clearDept);
  const { student } = useStudentAuth();
  const t = useT();
  const cfg = getDeptConfig(department);

  const items = allItems.filter((i) => i.department === department);
  const total = items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);

  const [pickupDate, setPickupDate] = useState(todayStr());
  const [pickupTime, setPickupTime] = useState("");
  const [pickupSlots, setPickupSlots] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<"idle" | "locating" | "sending" | "success">("idle");
  const [error, setError] = useState("");
  const [showAnimation, setShowAnimation] = useState(false);
  const [orderResult, setOrderResult] = useState<{ id: string; orderNumber: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/pickup-slots")
      .then((r) => r.json())
      .then((data) => setPickupSlots(data[department] || []))
      .catch(() => {});
    if (student) {
      fetch(`/api/wallet?studentId=${encodeURIComponent(student.studentId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) setWalletBalance(data.balance); })
        .catch(() => {});
    }
  }, [department, student]);

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

  function isSlotPassed(slot: string): boolean {
    if (!slot || slot === "盡快取餐") return false;
    if (pickupDate !== todayStr()) return false;
    const match = slot.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return false;
    const now = new Date();
    return parseInt(match[1]) * 60 + parseInt(match[2]) <= now.getHours() * 60 + now.getMinutes();
  }

  useEffect(() => {
    if (pickupTime && isSlotPassed(pickupTime)) setPickupTime("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupDate]);

  const handleAnimDone = useCallback(() => {
    if (orderResult) router.push(`/order/${orderResult.id}`);
  }, [orderResult, router]);

  async function handleSubmit() {
    if (!student) { router.push("/login"); return; }
    setSubmitting(true);
    setSubmitPhase("locating");
    setError("");

    try {
      const loc = await checkSchoolLocation();
      if (!loc.ok) { setError(loc.error || "定位失敗"); setSubmitting(false); setSubmitPhase("idle"); return; }
      setSubmitPhase("sending");

      const result = await createOrderSecure({
        studentId: student.studentId,
        studentName: student.studentName || null,
        className: student.className || null,
        department,
        note: note.trim() || null,
        paymentMethod,
        pickupDate: pickupDate || null,
        pickupTime: pickupTime || null,
        coords: loc.coords || null,
        items: items.map((i) => ({
          menuItemId: i.menuItem.id,
          name: i.menuItem.name,
          quantity: i.quantity,
          price: i.menuItem.price,
        })),
      });

      haptic([15, 60, 15]);
      setSubmitPhase("success");
      setOrderResult(result);
      // Hold the success state briefly so the user sees the checkmark before
      // the full-screen animation takes over — a beat of confirmation makes
      // the network→animation handoff feel continuous instead of abrupt.
      setTimeout(() => {
        clearDept(department);
        setShowAnimation(true);
      }, 380);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("order_error"));
      setSubmitting(false);
      setSubmitPhase("idle");
    }
  }

  if (showAnimation) {
    const displayNum = orderResult!.orderNumber.length > 6 ? orderResult!.orderNumber.slice(-4) : orderResult!.orderNumber;
    return (
      <OrderAnimation
        onDone={handleAnimDone}
        orderNumbers={[{ dept: department, displayNum }]}
      />
    );
  }

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${closing ? "animate-backdrop-out" : "animate-backdrop-in"}`} onClick={submitting ? undefined : onClose} />

      <div
        className={`relative bg-[#FFF8F0] dark:bg-stone-950 rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col ${
          flingOut ? "" : closing ? "animate-modal-out" : dragY === 0 && !snappingBack ? "animate-modal-in" : ""
        }`}
        style={
          flingOut
            ? { transform: "translate3d(0, 100vh, 0)", transition: "transform 0.22s cubic-bezier(0.4, 0, 1, 1)" }
            : dragY > 0
            ? { transform: `translate3d(0, ${dragY}px, 0)`, transition: "none" }
            : snappingBack
            ? { transform: "translate3d(0, 0, 0)", transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)" }
            : undefined
        }
      >
        <div
          className={`sticky top-0 z-10 rounded-t-3xl ${cfg.headerBg} text-white touch-none`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {/* Drag handle grabber */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/40" />
          </div>
          <div className="flex items-center gap-3 px-5 pb-4">
            <h1 className="text-lg font-bold tracking-tight flex-1">{cfg.label}購物車</h1>
            <button onClick={onClose} disabled={submitting} aria-label="關閉" className="p-1.5 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
            <p className="text-stone-400 dark:text-stone-500">{t("cart_empty")}</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Items */}
              <div className="space-y-2 stagger-children">
                {items.map((ci) => (
                  <div key={ci.menuItem.id} className="card-premium p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>{ci.menuItem.name}</p>
                      <p className="text-xs text-dim mt-0.5">${ci.menuItem.price} × {ci.quantity} = <span className="text-value">${ci.menuItem.price * ci.quantity}</span></p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(ci.menuItem.id, ci.quantity - 1)} className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center text-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors">−</button>
                      <input
                        type="number" inputMode="numeric" min={1} max={999} value={ci.quantity}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v >= 1 && v <= 999) updateQty(ci.menuItem.id, v);
                        }}
                        className="w-10 text-center font-bold text-sm text-stone-800 dark:text-stone-200 bg-transparent border-b-2 border-stone-200 dark:border-stone-600 focus:border-[#E23D28] outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button onClick={() => updateQty(ci.menuItem.id, ci.quantity + 1)} className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center text-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors">+</button>
                    </div>
                    <button onClick={() => remove(ci.menuItem.id)} className="text-red-400 text-xs hover:text-red-500 transition-colors">{t("delete")}</button>
                  </div>
                ))}
              </div>

              {/* Date & time */}
              <div className="space-y-2.5">
                <h3 className={`font-bold text-xs flex items-center gap-1.5 ${cfg.btnText}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {t("pickup_date")}
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {dateOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPickupDate(opt.value)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                        pickupDate === opt.value ? `${cfg.selectedBtn} shadow-md` : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 bg-white dark:bg-stone-900"
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {pickupSlots.length === 0 ? (
                    <p className="text-xs text-stone-400 dark:text-stone-500">{t("loading")}</p>
                  ) : pickupSlots.map((slot) => {
                    const passed = isSlotPassed(slot);
                    return (
                      <button
                        key={slot} disabled={passed} onClick={() => setPickupTime(slot)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-all duration-200 ${
                          passed ? "border-stone-100 dark:border-stone-800 text-stone-300 dark:text-stone-600 bg-stone-50 dark:bg-stone-900 cursor-not-allowed line-through"
                          : pickupTime === slot ? `${cfg.selectedBtn} shadow-md`
                          : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 bg-white dark:bg-stone-900"
                        }`}
                      >{slot}</button>
                    );
                  })}
                </div>
              </div>

              {/* Payment method */}
              <div className="space-y-2.5">
                <h3 className={`font-bold text-xs flex items-center gap-1.5 ${cfg.btnText}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  {t("payment_method")}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: "cash", label: t("cash"), enabled: true, sub: null as string | null },
                    { key: "wallet", label: t("wallet_pay"), enabled: walletBalance !== null && walletBalance >= total, sub: walletBalance !== null ? `${t("balance")} $${walletBalance}` : null },
                    { key: "easycard", label: t("easycard"), enabled: false, sub: null as string | null },
                    { key: "linepay", label: "LINE Pay", enabled: false, sub: null as string | null },
                  ]).map((pm) => (
                    <button
                      key={pm.key} type="button" disabled={!pm.enabled}
                      onClick={() => pm.enabled && setPaymentMethod(pm.key)}
                      className={`relative px-3 py-2.5 rounded-lg text-xs border transition-all duration-200 ${
                        !pm.enabled ? "border-stone-100 dark:border-stone-800 text-stone-300 dark:text-stone-600 bg-stone-50 dark:bg-stone-900 cursor-not-allowed"
                        : paymentMethod === pm.key ? `${cfg.selectedBtn} shadow-md`
                        : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 bg-white dark:bg-stone-900"
                      }`}
                    >
                      <span>{pm.label}</span>
                      {pm.sub && <span className="block text-[10px] opacity-70 mt-0.5">{pm.sub}</span>}
                      {!pm.enabled && pm.key !== "wallet" && (
                        <span className="absolute -top-2 -right-2 bg-stone-400 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">{t("coming_soon")}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <h3 className={`font-bold text-xs flex items-center gap-1.5 ${cfg.btnText}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  {t("note")}
                </h3>
                <textarea
                  value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("note_placeholder")} rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#E23D28]/20 focus:border-[#E23D28] transition-all"
                />
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            </div>

            <div className="p-5 border-t border-stone-200/50 dark:border-stone-800 space-y-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="flex justify-between items-baseline">
                <span className="text-label text-sm">{t("total")}</span>
                <span className="text-value text-2xl">${total}</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !student}
                className={`w-full ${submitPhase === "success" ? "bg-emerald-500" : cfg.btnBg} text-white rounded-2xl px-4 py-3.5 font-semibold shadow-lg hover:shadow-xl transition-colors duration-300 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2`}
              >
                {submitPhase === "success" ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-scale-bounce">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>已送出</span>
                  </>
                ) : submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>{submitPhase === "locating" ? "確認位置中…" : t("submitting")}</span>
                  </>
                ) : (
                  <span>{`${t("submit_order")}（$${total}）`}</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
