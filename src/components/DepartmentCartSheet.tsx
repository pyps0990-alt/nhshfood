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
import { PaymentMethodPicker, type PayMethod } from "@/components/glass/PaymentMethodPicker";

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
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("cash");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<"idle" | "locating" | "sending" | "success" | "redirecting">("idle");
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
      if (result.redirectUrl) {
        // Online payment: the order is reserved; hand the browser to ECPay.
        setSubmitPhase("redirecting");
        clearDept(department);
        window.location.href = result.redirectUrl;
        return;
      }
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
      <div className={`absolute inset-0 bg-black/25 ${closing ? "animate-backdrop-out" : "animate-backdrop-in"}`} onClick={submitting ? undefined : onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${cfg.label}購物車`}
        className={`relative lg-sheet max-h-[92vh] flex flex-col sm:max-w-2xl ${
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
          className="sticky top-0 z-10 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="lg-grabber" />
          <div className="flex items-center gap-3 px-5 pt-1 pb-3">
            <div className="flex-1 min-w-0">
              <h1 className="ios-title2 lg-ink">{cfg.label}購物車</h1>
              <p className="ios-footnote lg-ink-2">{items.reduce((n, i) => n + i.quantity, 0)} 件品項</p>
            </div>
            <button onClick={onClose} disabled={submitting} aria-label="關閉" className="lg-btn lg-btn-icon lg-glass lg-ink !w-11 !min-h-11">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
            <p className="lg-ink-3">{t("cart_empty")}</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5 overscroll-contain">
              {/* Items */}
              <div className="lg-list">
                {items.map((ci) => (
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
                        className="w-8 h-8 rounded-full grid place-items-center lg-tinted active:scale-90 transition-transform"
                        data-dept={department}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Date & time */}
              <div className="space-y-2.5">
                <h3 className="ios-footnote flex items-center gap-1.5 lg-ink-2 px-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {t("pickup_date")}
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {dateOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPickupDate(opt.value)}
                      aria-pressed={pickupDate === opt.value}
                      className="lg-chip flex-shrink-0"
                    >{opt.label}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {pickupSlots.length === 0 ? (
                    <p className="text-xs lg-ink-3 px-1">{t("loading")}</p>
                  ) : pickupSlots.map((slot) => {
                    const passed = isSlotPassed(slot);
                    return (
                      <button
                        key={slot} disabled={passed} onClick={() => setPickupTime(slot)}
                        aria-pressed={pickupTime === slot}
                        className={`lg-chip tabular-nums ${passed ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                      >{slot}</button>
                    );
                  })}
                </div>
              </div>

              {/* Payment method */}
              <div className="space-y-2.5">
                <h3 className="ios-footnote flex items-center gap-1.5 lg-ink-2 px-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  {t("payment_method")}
                </h3>
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  total={total}
                  walletBalance={walletBalance}
                />
                {paymentMethod === "ecpay" && (
                  <p className="text-[12px] lg-ink-3 px-1 leading-relaxed">
                    送出後會前往綠界付款頁面，付款完成才會通知店家備餐；20 分鐘內未付款訂單會自動取消。
                  </p>
                )}
              </div>

              {/* Note */}
              <div className="space-y-2">
                <h3 className="ios-footnote flex items-center gap-1.5 lg-ink-2 px-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  {t("note")}
                </h3>
                <textarea
                  value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("note_placeholder")} rows={2}
                  maxLength={200}
                  className="lg-field !text-[15px] resize-none"
                />
              </div>

              {error && <p className="text-red-500 text-sm font-medium px-1" role="alert">{error}</p>}
            </div>

            <div className="px-4 pt-3 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]" style={{ boxShadow: "inset 0 0.5px 0 var(--lg-edge)" }}>
              <div className="flex justify-between items-baseline px-1">
                <span className="text-[15px] lg-ink-2">{t("total")}</span>
                <span className="text-[28px] font-bold lg-ink tabular-nums tracking-tight" style={{ fontFamily: "var(--font-rounded)" }}>${total}</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !student}
                data-dept={department}
                className={`lg-btn lg-btn-lg w-full ${submitPhase === "success" ? "bg-emerald-500 text-white" : "lg-tinted"}`}
              >
                {submitPhase === "success" ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-scale-bounce"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>已送出</span>
                  </>
                ) : submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>{submitPhase === "locating" ? "確認位置中…" : submitPhase === "redirecting" ? "前往付款…" : t("submitting")}</span>
                  </>
                ) : (
                  <span>{paymentMethod === "ecpay" ? `前往付款 $${total}` : `${t("submit_order")} · $${total}`}</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
