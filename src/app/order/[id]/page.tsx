"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { useOrder } from "@/lib/hooks";
import { NavBar, IconButton } from "@/components/glass/NavBar";
import { useExitAnimation } from "@/lib/useExitAnimation";

const statusMap: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "待確認", color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", icon: "pending" },
  confirmed: { label: "準備中", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800", icon: "confirmed" },
  ready: { label: "可取餐", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800", icon: "ready" },
  picked_up: { label: "已取餐", color: "text-stone-500 dark:text-stone-400", bg: "bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700", icon: "picked_up" },
  cancelled: { label: "已取消", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", icon: "cancelled" },
  awaiting_payment: { label: "等待付款", color: "", bg: "", icon: "pending" },
  payment_failed: { label: "付款未完成", color: "", bg: "", icon: "cancelled" },
};

const PAYMENT_LABEL: Record<string, string> = { cash: "現金（取餐時付款）", wallet: "校園錢包", ecpay: "線上付款（綠界）" };

type OrderExtra = { paymentMethod?: string; paymentStatus?: string; merchantTradeNo?: string | null; refunded?: boolean; refundAmount?: number };

function PaymentPanel({ orderId, merchantTradeNo, total }: { orderId: string; merchantTradeNo: string | null; total: number }) {
  const [busy, setBusy] = useState<"" | "pay" | "sync">("");
  const [msg, setMsg] = useState("");

  async function pay() {
    setBusy("pay"); setMsg("");
    try {
      const res = await fetch("/api/payments/ecpay/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "order", orderId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "無法建立付款");
      window.location.href = d.redirectUrl;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "無法建立付款");
      setBusy("");
    }
  }

  async function sync() {
    if (!merchantTradeNo) return;
    setBusy("sync"); setMsg("");
    try {
      const res = await fetch("/api/payments/ecpay/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantTradeNo }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "查詢失敗");
      setMsg(d.status === "paid" ? "已確認付款，訂單已送出給店家" : "綠界尚未收到這筆付款");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "查詢失敗");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="lg-card p-5 space-y-3 lg-rise">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full grid place-items-center bg-amber-500/15 text-amber-600 shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></svg>
        </span>
        <div className="flex-1">
          <p className="font-semibold lg-ink">尚未完成付款</p>
          <p className="text-[13px] lg-ink-3">付款完成後店家才會開始備餐，20 分鐘內未付款將自動取消</p>
        </div>
      </div>
      <button onClick={pay} disabled={!!busy} className="lg-btn lg-btn-lg lg-tinted w-full">
        {busy === "pay" ? "前往付款…" : `前往付款 $${total}`}
      </button>
      {merchantTradeNo && (
        <button onClick={sync} disabled={!!busy} className="lg-btn w-full lg-thin lg-ink-2">
          {busy === "sync" ? "查詢中…" : "我已付款，重新確認"}
        </button>
      )}
      {msg && <p className="text-[13px] text-center lg-ink-2" role="status">{msg}</p>}
    </div>
  );
}

function StatusIcon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "pending":
      return <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case "confirmed":
      return <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>;
    case "ready":
      return <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
    case "picked_up":
      return <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
    case "cancelled":
      return <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
    default:
      return null;
  }
}

const steps = ["pending", "confirmed", "ready", "picked_up"];
const stepLabels = ["待確認", "準備中", "可取餐", "已取餐"];
// Percentages line up with each step marker's horizontal center (4 equal-width columns);
// the final step fills to 100% instead of its column center since there's no next step to lead into.
const stepPercent = [12.5, 37.5, 62.5, 100];

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { order, loading } = useOrder(id);
  const searchParams = useSearchParams();
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const { mounted: saveToastMounted, closing: saveToastClosing } = useExitAnimation(showSaveToast, 200);
  const [toastDismissed, setToastDismissed] = useState(false);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [statusChanged, setStatusChanged] = useState(false);
  const [showPickedUpOverlay, setShowPickedUpOverlay] = useState(false);
  const [showReadyBanner, setShowReadyBanner] = useState(false);
  const [elapsedMin, setElapsedMin] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!order || order.status === "picked_up" || order.status === "cancelled" || order.status === "ready") return;
    const calc = () => {
      const created = new Date(order.createdAt).getTime();
      setElapsedMin(Math.floor((Date.now() - created) / 60000));
    };
    calc();
    const iv = setInterval(calc, 30000);
    return () => clearInterval(iv);
  }, [order]);

  useEffect(() => {
    if (!order) return;
    if (prevStatus !== null && prevStatus !== order.status) {
      setStatusChanged(true);
      const t = setTimeout(() => setStatusChanged(false), 1500);
      if (order.status === "picked_up") setShowPickedUpOverlay(true);
      if (order.status === "ready") setShowReadyBanner(true);
      return () => clearTimeout(t);
    }
    setPrevStatus(order.status);
  }, [order?.status, prevStatus, order]);

  useEffect(() => {
    if (order && !toastDismissed && !["picked_up", "cancelled", "awaiting_payment", "payment_failed"].includes(order.status)) {
      const t = setTimeout(() => setShowSaveToast(true), 2500);
      return () => clearTimeout(t);
    }
  }, [order, toastDismissed]);

  useEffect(() => {
    if (!order) return;
    const pickupUrl = `${window.location.origin}/order/${order.id}`;
    QRCode.toDataURL(pickupUrl, { width: 480, margin: 1, color: { dark: "#1c1917", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [order]);

  const handleSaveQRCode = useCallback(async () => {
    if (!order || !qrDataUrl || saving) return;
    setSaving(true);
    setShowSaveToast(false);
    setToastDismissed(true);

    try {
      const dpr = 3;
      const W = 360 * dpr;
      const H = 500 * dpr;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = W;
      canvas.height = H;

      const s = dpr;
      ctx.scale(s, s);
      const w = W / s;
      const h = H / s;

      const displayNum = order.orderNumber.length > 6 ? order.orderNumber.slice(-4) : order.orderNumber;
      const deptLabel = order.department === "breakfast" ? "早餐部" : "午餐部";
      const statusLabel = statusMap[order.status]?.label || order.status;

      ctx.fillStyle = "#FFF8F0";
      ctx.fillRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#E23D28");
      grad.addColorStop(1, "#FF6B35");
      ctx.fillStyle = grad;
      roundRect(ctx, 20, 20, w - 40, 56, 16);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 17px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("內湖高中熱食部", w / 2, 55);

      ctx.fillStyle = "#1c1917";
      ctx.font = "900 40px system-ui, sans-serif";
      ctx.fillText(`#${displayNum}`, w / 2, 130);

      const badgeColors: Record<string, [string, string]> = {
        pending: ["#fef3c7", "#92400e"],
        confirmed: ["#dbeafe", "#1e40af"],
        ready: ["#d1fae5", "#065f46"],
        picked_up: ["#f5f5f4", "#57534e"],
        cancelled: ["#fee2e2", "#991b1b"],
      };
      const [badgeBg, badgeFg] = badgeColors[order.status] || ["#f5f5f4", "#57534e"];
      ctx.font = "bold 13px system-ui, sans-serif";
      const badgeW = ctx.measureText(statusLabel).width + 28;
      ctx.fillStyle = badgeBg;
      roundRect(ctx, (w - badgeW) / 2, 145, badgeW, 28, 14);
      ctx.fill();
      ctx.fillStyle = badgeFg;
      ctx.fillText(statusLabel, w / 2, 164);

      const qrImg = await loadImage(qrDataUrl);
      const qrSize = 220;
      const qrX = (w - qrSize) / 2;
      const qrY = 195;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 16);
      ctx.fill();
      ctx.strokeStyle = "#e7e5e4";
      ctx.lineWidth = 1;
      roundRect(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 16);
      ctx.stroke();
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      let y = qrY + qrSize + 44;
      ctx.fillStyle = "#78716c";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(`${deptLabel} · ${order.studentId}${order.pickupTime ? " · " + order.pickupTime : ""}`, w / 2, y);

      y += 22;
      ctx.fillStyle = "#a8a29e";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText("取餐時請出示此 QR Code", w / 2, y);

      y += 26;
      ctx.fillStyle = "#d6d3d1";
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillText("內湖高中熱食部 · nhsh-food.vercel.app", w / 2, y);

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png")
      );
      const fileName = `取餐QRCode_${order.orderNumber}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const link = document.createElement("a");
        link.download = fileName;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") { /* user cancelled share */ }
      else {
        console.error("Save QR code error:", err);
        alert("儲存失敗，請使用截圖功能");
      }
    } finally {
      setSaving(false);
    }
  }, [saving, order, qrDataUrl]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-stone-200 dark:border-stone-700 border-t-stone-500 dark:border-t-stone-400 rounded-full animate-spin" />
      </div>
    );
  }
  if (!order) return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 dark:text-stone-600">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-200 mb-1">找不到訂單</h2>
      <p className="text-sm text-stone-400 dark:text-stone-500 text-center mb-6">請確認訂單編號是否正確，或回首頁重新查詢</p>
      <Link href="/" className="text-[#E23D28] font-semibold text-sm hover:underline">回到首頁</Link>
    </div>
  );

  const status = statusMap[order.status] || statusMap.pending;
  const extra = order as typeof order & OrderExtra;
  const paymentFlag = searchParams.get("payment");
  const unpaid = order.status === "awaiting_payment";
  const terminalNoPickup = ["cancelled", "payment_failed", "awaiting_payment"].includes(order.status);
  const deptLabel = order.department === "breakfast" ? "早餐部" : "午餐部";
  const currentStep = steps.indexOf(order.status);
  const progressPct = currentStep >= 0 ? stepPercent[currentStep] : 0;
  const displayNumber = order.orderNumber.length > 6
    ? order.orderNumber.slice(-4)
    : order.orderNumber;

  return (
    <div className="flex-1 flex flex-col">
      {showPickedUpOverlay && (
        <PickedUpOverlay
          displayNumber={displayNumber}
          onDone={() => { setShowPickedUpOverlay(false); router.push("/"); }}
        />
      )}

      <NavBar
        backHref="/"
        title="訂單狀態"
        subtitle={deptLabel}
        right={
          qrDataUrl && !["cancelled", "awaiting_payment", "payment_failed"].includes(order.status) ? (
            <IconButton label="儲存 QR Code" onClick={handleSaveQRCode}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            </IconButton>
          ) : null
        }
      />

      <main className="flex-1 px-4 pt-4 pb-32 space-y-4 max-w-lg mx-auto w-full">
        {paymentFlag === "failed" && unpaid && (
          <div className="lg-card px-4 py-3 text-[14px] text-red-600 dark:text-red-400 font-medium lg-rise" role="alert">付款未完成，可以再試一次。</div>
        )}
        {paymentFlag === "success" && !unpaid && (
          <div className="lg-card px-4 py-3 text-[14px] text-emerald-700 dark:text-emerald-400 font-medium lg-rise" role="status">付款成功！店家已收到你的訂單。</div>
        )}
        <div ref={cardRef} className="space-y-4">
          <div className={`lg-card px-5 pt-6 pb-5 text-center lg-rise ${statusChanged ? "animate-scale-bounce" : ""}`}>
            <p className="text-[13px] lg-ink-3 mb-1">取餐號碼</p>
            <p className="text-[56px] leading-none font-bold lg-ink tracking-tight tabular-nums" style={{ fontFamily: "var(--font-rounded)" }}>#{displayNumber}</p>
            <div className="mt-4 flex justify-center">
              <span className="lg-status !text-[14px] !px-4 !py-1.5" data-s={order.status}>
                {status.label}
              </span>
            </div>
            {(order.status === "pending" || order.status === "confirmed") && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[13px] lg-ink-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>
                  {order.status === "pending"
                    ? `已等待 ${elapsedMin < 1 ? "不到 1" : elapsedMin} 分鐘`
                    : `準備中 · 約 ${Math.max(1, (order.status === "confirmed" ? 10 : 15) - elapsedMin)} 分鐘`
                  }
                </span>
              </div>
            )}
          </div>

          {unpaid && <PaymentPanel orderId={order.id} merchantTradeNo={extra.merchantTradeNo || null} total={order.totalPrice} />}

          {!terminalNoPickup && order.status !== "picked_up" && qrDataUrl && (
            <div className="lg-card p-5 flex flex-col items-center gap-2.5">
              <div className="p-2.5 rounded-[22px] bg-white shadow-sm">
                <img src={qrDataUrl} alt="取餐 QR Code" width={176} height={176} className="rounded-xl" />
              </div>
              <p className="text-[12px] lg-ink-3">取餐時請出示此 QR Code</p>
            </div>
          )}

          {!terminalNoPickup && (
            <div className="lg-card px-4 py-5 space-y-3">
              <div className="relative h-2 bg-black/8 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${progressPct}%`,
                    background: progressPct === 100
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : "linear-gradient(90deg, #E23D28, #FF6B35)",
                  }}
                />
                {currentStep >= 0 && currentStep < 3 && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${progressPct}%`,
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 2s linear infinite",
                    }}
                  />
                )}
              </div>

              <div className="flex justify-between">
                {steps.map((s, i) => {
                  const isActive = i <= currentStep;
                  const isCurrent = i === currentStep;
                  return (
                    <div key={s} className="flex flex-col items-center" style={{ width: "25%" }}>
                      <div className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-700
                        ${isCurrent
                          ? (i === 3 ? "bg-emerald-500 border-emerald-500" : "bg-[#E23D28] border-[#E23D28]") + " text-white scale-110 shadow-md"
                          : isActive
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-white/50 dark:bg-white/5 border-black/10 dark:border-white/15 lg-ink-3"
                        }
                        ${isCurrent && statusChanged ? "animate-scale-bounce" : ""}
                      `}>
                        {isActive ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      <span className={`text-[11px] mt-1.5 whitespace-nowrap font-medium transition-colors duration-500 ${
                        isCurrent ? (i === 3 ? "text-emerald-600 dark:text-emerald-400" : "text-[#E23D28]") + " font-bold" : isActive ? "text-emerald-500 dark:text-emerald-400" : "lg-ink-3"
                      }`}>
                        {stepLabels[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(order.status === "cancelled" || order.status === "payment_failed") && (
            <div className="lg-card p-5 text-center">
              <p className="text-red-600 dark:text-red-400 font-bold text-lg">{order.status === "cancelled" ? "訂單已取消" : "付款未完成，訂單已取消"}</p>
              <p className="lg-ink-3 text-sm mt-1">
                {extra.refunded && extra.refundAmount ? `$${extra.refundAmount} 已退回你的校園錢包。` : "如有疑問請至熱食部窗口洽詢"}
              </p>
            </div>
          )}

          <div className="lg-card p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="lg-ink-3">部門</span>
              <span className="font-medium lg-ink">{deptLabel}</span>
            </div>
            {order.className && (
              <div className="flex justify-between text-sm">
                <span className="lg-ink-3">班級</span>
                <span className="font-medium lg-ink">{order.className}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="lg-ink-3">學號</span>
              <span className="font-medium lg-ink">{order.studentId}</span>
            </div>
            {extra.paymentMethod && (
              <div className="flex justify-between text-sm">
                <span className="lg-ink-3">付款方式</span>
                <span className="font-medium lg-ink">
                  {PAYMENT_LABEL[extra.paymentMethod] || extra.paymentMethod}
                  {extra.paymentStatus === "paid" && extra.paymentMethod !== "cash" && <span className="ml-1.5 text-emerald-600">✓ 已付款</span>}
                </span>
              </div>
            )}
            {order.pickupTime && (
              <div className="flex justify-between text-sm">
                <span className="lg-ink-3">取餐時間</span>
                <span className="font-medium lg-ink">{order.pickupTime}</span>
              </div>
            )}
            {order.note && (
              <div className="flex justify-between text-sm">
                <span className="lg-ink-3">備註</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{order.note}</span>
              </div>
            )}
          </div>

          <div className="lg-card p-5">
            <h3 className="font-semibold lg-ink mb-3">訂單內容</h3>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1.5">
                <span className="text-stone-700 dark:text-stone-300">{item.name} × {item.quantity}</span>
                <span className="font-medium lg-ink">${item.price * item.quantity}</span>
              </div>
            ))}
            <div className="mt-3 pt-3 flex justify-between font-bold text-lg lg-ink tabular-nums" style={{ boxShadow: "inset 0 0.5px 0 var(--lg-edge)" }}>
              <span>合計</span>
              <span>${order.totalPrice}</span>
            </div>
          </div>

          
        </div>

        {order.status === "ready" && (
          <div className={`lg-card p-6 text-center ${showReadyBanner ? "animate-slide-up" : ""}`} style={{ background: "rgba(16,185,129,0.14)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-emerald-500">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p className="text-emerald-800 dark:text-emerald-300 font-bold text-xl">餐點已備好！</p>
            <p className="text-emerald-600 dark:text-emerald-400 mt-2">請至{deptLabel}取餐</p>
          </div>
        )}

        {order.status === "picked_up" && (
          <div className="lg-card p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-amber-500">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
            </svg>
            <p className="text-amber-800 dark:text-amber-300 font-bold text-xl">請享用！</p>
            <p className="text-amber-600 dark:text-amber-400 mt-2">感謝您使用內湖高中熱食部線上訂餐</p>
          </div>
        )}
      </main>

      {/* Thumb-zone floating bar */}
      {order.status !== "picked_up" && !terminalNoPickup && (
        <div className="lg-float">
          <div className="lg-thick rounded-full p-1.5 flex gap-1.5">
            <Link href="/" className="lg-btn flex-1 lg-ink-2">回首頁</Link>
            <button onClick={handleSaveQRCode} disabled={saving || !qrDataUrl} className="lg-btn flex-1 lg-tinted">
              {saving ? "儲存中…" : "儲存 QR Code"}
            </button>
          </div>
        </div>
      )}
      {terminalNoPickup && !unpaid && (
        <div className="lg-float">
          <Link href="/" className="lg-btn lg-btn-lg w-full lg-thick lg-ink">回首頁</Link>
        </div>
      )}

      {saveToastMounted && (
        <div className={`fixed bottom-[calc(88px+env(safe-area-inset-bottom))] inset-x-4 z-50 flex justify-center ${saveToastClosing ? "animate-toast-out" : "animate-toast-in"}`}>
          <div className="lg-smoke rounded-[26px] px-4 py-3.5 flex items-center gap-3 max-w-sm w-full">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">建議保存取餐 QR Code</p>
              <p className="text-xs text-stone-400 mt-0.5">點擊「儲存」直接存到相簿</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleSaveQRCode} className="lg-btn lg-btn-sm bg-white text-stone-900">儲存</button>
              <button onClick={() => { setShowSaveToast(false); setToastDismissed(true); }} className="px-2 py-1.5 text-stone-500 hover:text-white text-xs transition-colors">略過</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PickedUpOverlay({ displayNumber, onDone }: { displayNumber: string; onDone: () => void }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) { onDone(); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onDone]);

  return (
    <div className="fixed inset-0 z-[60] lg-thick flex items-center justify-center" onClick={onDone}>
      <div className="flex flex-col items-center px-8 text-center animate-fade-in">
        <div className="animate-scale-bounce mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#E23D28" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
          </svg>
        </div>
        <p className="text-3xl font-black text-stone-900 dark:text-stone-100 animate-float-up">請享用！</p>
        <p className="text-lg text-stone-600 dark:text-stone-400 mt-3 animate-float-up" style={{ animationDelay: "0.2s" }}>
          感謝您的訂購
        </p>
        <p className="text-sm text-stone-400 dark:text-stone-500 mt-2 animate-float-up" style={{ animationDelay: "0.4s" }}>
          取餐號碼 #{displayNumber}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); onDone(); }}
          className="mt-10 lg-btn lg-btn-lg lg-tinted animate-float-up"
          style={{ animationDelay: "0.6s" }}
        >
          回首頁
        </button>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-4 animate-float-up" style={{ animationDelay: "0.8s" }}>
          {countdown} 秒後自動返回首頁
        </p>
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
