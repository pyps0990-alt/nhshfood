"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { useOrder } from "@/lib/hooks";
import { BackButton } from "@/components/BackButton";
import { useExitAnimation } from "@/lib/useExitAnimation";

const statusMap: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "待確認", color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", icon: "pending" },
  confirmed: { label: "準備中", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800", icon: "confirmed" },
  ready: { label: "可取餐", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800", icon: "ready" },
  picked_up: { label: "已取餐", color: "text-stone-500 dark:text-stone-400", bg: "bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700", icon: "picked_up" },
  cancelled: { label: "已取消", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", icon: "cancelled" },
};

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
    if (order && !toastDismissed && order.status !== "picked_up" && order.status !== "cancelled") {
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

      <header className="glass dark:bg-stone-900/85 border-b border-stone-200/50 dark:border-stone-800 px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <BackButton href="/" />
        <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">訂單狀態</h1>
        <button
          onClick={handleSaveQRCode}
          disabled={saving || !qrDataUrl}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl text-sm font-medium text-stone-700 dark:text-stone-300 transition-colors disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {saving ? "儲存中..." : "儲存"}
        </button>
      </header>

      <main className="flex-1 px-5 py-8 space-y-6 animate-fade-in">
        <div ref={cardRef} className="space-y-6">
          <div className={`text-center ${statusChanged ? "animate-scale-bounce" : ""}`}>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-1">取餐號碼</p>
            <p className="text-4xl sm:text-5xl font-black text-stone-900 dark:text-stone-100 tracking-tight">#{displayNumber}</p>
            <div className={`inline-flex items-center gap-1.5 mt-4 px-5 py-2 rounded-full text-sm font-semibold border ${status.bg} ${status.color} transition-all duration-500`}>
              <StatusIcon type={status.icon} />
              <span>{status.label}</span>
            </div>
            {(order.status === "pending" || order.status === "confirmed") && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
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

          {order.status !== "cancelled" && order.status !== "picked_up" && qrDataUrl && (
            <div className="card-premium p-5 flex flex-col items-center gap-2">
              <img src={qrDataUrl} alt="取餐 QR Code" width={180} height={180} className="rounded-xl border border-stone-100 dark:border-stone-700" />
              <p className="text-xs text-stone-400 dark:text-stone-500">取餐時請出示此 QR Code</p>
            </div>
          )}

          {order.status !== "cancelled" && (
            <div className="px-2 space-y-3">
              <div className="relative h-2.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
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
                          : "bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-stone-400 dark:text-stone-500"
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
                        isCurrent ? (i === 3 ? "text-emerald-600 dark:text-emerald-400" : "text-[#E23D28]") + " font-bold" : isActive ? "text-emerald-500 dark:text-emerald-400" : "text-stone-400 dark:text-stone-500"
                      }`}>
                        {stepLabels[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {order.status === "cancelled" && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-5 text-center">
              <p className="text-red-700 dark:text-red-400 font-bold text-lg">訂單已取消</p>
              <p className="text-red-500 dark:text-red-400/70 text-sm mt-1">如有疑問請至熱食部窗口洽詢</p>
            </div>
          )}

          <div className="card-premium p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500 dark:text-stone-400">部門</span>
              <span className="font-medium text-stone-800 dark:text-stone-200">{deptLabel}</span>
            </div>
            {order.className && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500 dark:text-stone-400">班級</span>
                <span className="font-medium text-stone-800 dark:text-stone-200">{order.className}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-stone-500 dark:text-stone-400">學號</span>
              <span className="font-medium text-stone-800 dark:text-stone-200">{order.studentId}</span>
            </div>
            {order.pickupTime && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500 dark:text-stone-400">取餐時間</span>
                <span className="font-medium text-stone-800 dark:text-stone-200">{order.pickupTime}</span>
              </div>
            )}
            {order.note && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500 dark:text-stone-400">備註</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{order.note}</span>
              </div>
            )}
          </div>

          <div className="card-premium p-5">
            <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-3">訂單內容</h3>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1.5">
                <span className="text-stone-700 dark:text-stone-300">{item.name} × {item.quantity}</span>
                <span className="font-medium text-stone-800 dark:text-stone-200">${item.price * item.quantity}</span>
              </div>
            ))}
            <div className="border-t border-stone-100 dark:border-stone-700 mt-3 pt-3 flex justify-between font-bold text-lg text-stone-900 dark:text-stone-100">
              <span>合計</span>
              <span>${order.totalPrice}</span>
            </div>
          </div>

          <p className="text-center text-[10px] text-stone-300 dark:text-stone-600 pt-2">內湖高中熱食部 · nhsh-food.vercel.app</p>
        </div>

        {order.status === "ready" && (
          <div className={`bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center ${showReadyBanner ? "animate-slide-up" : ""}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-emerald-500">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p className="text-emerald-800 dark:text-emerald-300 font-bold text-xl">餐點已備好！</p>
            <p className="text-emerald-600 dark:text-emerald-400 mt-2">請至{deptLabel}取餐</p>
          </div>
        )}

        {order.status === "picked_up" && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-amber-500">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
            </svg>
            <p className="text-amber-800 dark:text-amber-300 font-bold text-xl">請享用！</p>
            <p className="text-amber-600 dark:text-amber-400 mt-2">感謝您使用內湖高中熱食部線上訂餐</p>
          </div>
        )}
      </main>

      {/* Thumb-zone bottom bar */}
      {order.status !== "picked_up" && (
        <div className="sticky bottom-0 p-4 glass dark:bg-stone-900/90 border-t border-stone-200/50 dark:border-stone-800">
          <div className="flex gap-3 max-w-lg mx-auto">
            <Link href="/" className="flex-1 text-center border-2 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-2xl py-3 font-semibold text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              回首頁
            </Link>
            <button onClick={handleSaveQRCode} disabled={saving || !qrDataUrl}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#E23D28] to-[#FF6B35] text-white rounded-2xl py-3 font-semibold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {saving ? "儲存中..." : "儲存 QR Code"}
            </button>
          </div>
        </div>
      )}

      {saveToastMounted && (
        <div className={`fixed bottom-6 inset-x-4 z-50 flex justify-center ${saveToastClosing ? "animate-toast-out" : "animate-toast-in"}`}>
          <div className="bg-stone-900 dark:bg-stone-800 text-white rounded-2xl px-5 py-4 shadow-2xl shadow-stone-900/30 flex items-center gap-3 max-w-sm w-full">
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
              <button onClick={handleSaveQRCode} className="px-3 py-1.5 bg-white text-stone-900 rounded-lg text-xs font-bold hover:bg-stone-100 transition-colors">儲存</button>
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
    <div className="fixed inset-0 z-[60] bg-[#FFF8F0] dark:bg-stone-950 flex items-center justify-center" onClick={onDone}>
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
          className="mt-10 px-8 py-3 bg-[#E23D28] text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all animate-float-up active:scale-95"
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
