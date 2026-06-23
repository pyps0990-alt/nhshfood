"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import { useOrder } from "@/lib/hooks";
import { BackButton } from "@/components/BackButton";

const statusMap: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  pending: { label: "待確認", color: "text-red-700", bg: "bg-red-50 border-red-200", emoji: "⏳" },
  confirmed: { label: "準備中", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", emoji: "👨‍🍳" },
  ready: { label: "可取餐", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", emoji: "✅" },
  picked_up: { label: "已取餐", color: "text-stone-500", bg: "bg-stone-50 border-stone-200", emoji: "🎉" },
  cancelled: { label: "已取消", color: "text-red-600", bg: "bg-red-50 border-red-200", emoji: "❌" },
};

const steps = ["pending", "confirmed", "ready", "picked_up"];
const stepLabels = ["待確認", "準備中", "可取餐", "已取餐"];
const stepPercent = [0, 33, 66, 100];

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { order, loading } = useOrder(id);
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [toastDismissed, setToastDismissed] = useState(false);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [statusChanged, setStatusChanged] = useState(false);
  const [showPickedUpOverlay, setShowPickedUpOverlay] = useState(false);
  const [showReadyBanner, setShowReadyBanner] = useState(false);

  // Track status changes
  useEffect(() => {
    if (!order) return;
    if (prevStatus !== null && prevStatus !== order.status) {
      setStatusChanged(true);
      const t = setTimeout(() => setStatusChanged(false), 1500);

      // "picked_up" → show enjoy overlay
      if (order.status === "picked_up") {
        setShowPickedUpOverlay(true);
      }

      // "ready" → show banner
      if (order.status === "ready") {
        setShowReadyBanner(true);
      }

      return () => clearTimeout(t);
    }
    setPrevStatus(order.status);
  }, [order?.status, prevStatus, order]);

  // Show save reminder
  useEffect(() => {
    if (order && !toastDismissed && order.status !== "picked_up" && order.status !== "cancelled") {
      const t = setTimeout(() => setShowSaveToast(true), 2500);
      return () => clearTimeout(t);
    }
  }, [order, toastDismissed]);

  // Generate order image using Canvas API (no html2canvas dependency issues)
  const handleSaveImage = useCallback(async () => {
    if (!order || saving) return;
    setSaving(true);
    setShowSaveToast(false);
    setToastDismissed(true);

    try {
      const dpr = 3;
      const W = 400 * dpr;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      const displayNum = order.orderNumber.length > 6 ? order.orderNumber.slice(-4) : order.orderNumber;
      const deptLabel = order.department === "breakfast" ? "早餐部" : "午餐部";
      const statusLabel = statusMap[order.status]?.label || order.status;

      // Compute height
      const itemCount = order.items.length;
      const H = (480 + itemCount * 28) * dpr;
      canvas.width = W;
      canvas.height = H;

      const s = dpr; // scale factor
      ctx.scale(s, s);
      const w = W / s;

      // Background
      ctx.fillStyle = "#FFF8F0";
      ctx.fillRect(0, 0, w, H / s);

      // Header gradient
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#E23D28");
      grad.addColorStop(1, "#FF6B35");
      ctx.fillStyle = grad;
      roundRect(ctx, 20, 20, w - 40, 60, 16);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("內湖高中熱食部", w / 2, 58);

      // Order number
      ctx.fillStyle = "#1c1917";
      ctx.font = "900 48px system-ui, sans-serif";
      ctx.fillText(`#${displayNum}`, w / 2, 140);

      // Status badge
      const badgeColors: Record<string, [string, string]> = {
        pending: ["#fef3c7", "#92400e"],
        confirmed: ["#dbeafe", "#1e40af"],
        ready: ["#d1fae5", "#065f46"],
        picked_up: ["#f5f5f4", "#57534e"],
        cancelled: ["#fee2e2", "#991b1b"],
      };
      const [badgeBg, badgeFg] = badgeColors[order.status] || ["#f5f5f4", "#57534e"];
      const badgeText = statusLabel;
      ctx.font = "bold 14px system-ui, sans-serif";
      const badgeW = ctx.measureText(badgeText).width + 32;
      ctx.fillStyle = badgeBg;
      roundRect(ctx, (w - badgeW) / 2, 155, badgeW, 30, 15);
      ctx.fill();
      ctx.fillStyle = badgeFg;
      ctx.fillText(badgeText, w / 2, 175);

      // Info section
      let y = 210;
      ctx.textAlign = "left";
      ctx.font = "14px system-ui, sans-serif";

      const drawRow = (label: string, value: string) => {
        ctx.fillStyle = "#78716c";
        ctx.fillText(label, 40, y);
        ctx.fillStyle = "#1c1917";
        ctx.font = "600 14px system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(value, w - 40, y);
        ctx.textAlign = "left";
        ctx.font = "14px system-ui, sans-serif";
        y += 28;
      };

      drawRow("部門", deptLabel);
      if (order.className) drawRow("班級", order.className);
      drawRow("學號", order.studentId);
      if (order.pickupTime) drawRow("取餐時間", order.pickupTime);

      // Divider
      y += 8;
      ctx.strokeStyle = "#e7e5e4";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 40, y);
      ctx.stroke();
      y += 16;

      // Items header
      ctx.fillStyle = "#1c1917";
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("訂單內容", 40, y);
      y += 24;

      // Items
      ctx.font = "14px system-ui, sans-serif";
      for (const item of order.items) {
        ctx.fillStyle = "#44403c";
        ctx.textAlign = "left";
        ctx.fillText(`${item.name} × ${item.quantity}`, 40, y);
        ctx.textAlign = "right";
        ctx.fillStyle = "#1c1917";
        ctx.font = "600 14px system-ui, sans-serif";
        ctx.fillText(`$${item.price * item.quantity}`, w - 40, y);
        ctx.font = "14px system-ui, sans-serif";
        y += 28;
      }

      // Total
      y += 4;
      ctx.strokeStyle = "#e7e5e4";
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 40, y);
      ctx.stroke();
      y += 24;

      ctx.fillStyle = "#1c1917";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("合計", 40, y);
      ctx.textAlign = "right";
      ctx.fillText(`$${order.totalPrice}`, w - 40, y);

      // Watermark
      y += 40;
      ctx.fillStyle = "#d6d3d1";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("內湖高中熱食部 · nhsh-food.vercel.app", w / 2, y);

      // Download
      const link = document.createElement("a");
      link.download = `訂單_${order.orderNumber}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Save image error:", err);
      alert("儲存失敗，請使用截圖功能");
    } finally {
      setSaving(false);
    }
  }, [saving, order]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!order) return <p className="text-center mt-20 text-stone-400">找不到訂單</p>;

  const status = statusMap[order.status] || statusMap.pending;
  const deptLabel = order.department === "breakfast" ? "早餐部" : "午餐部";
  const currentStep = steps.indexOf(order.status);
  const progressPct = currentStep >= 0 ? stepPercent[currentStep] : 0;
  const displayNumber = order.orderNumber.length > 6
    ? order.orderNumber.slice(-4)
    : order.orderNumber;

  return (
    <div className="flex-1 flex flex-col">
      {/* "已取餐 — 請享用" full-screen overlay → auto redirect */}
      {showPickedUpOverlay && (
        <PickedUpOverlay
          displayNumber={displayNumber}
          onDone={() => { setShowPickedUpOverlay(false); router.push("/"); }}
        />
      )}

      <header className="glass border-b border-stone-200/50 px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <BackButton href="/" />
        <h1 className="text-lg font-bold text-stone-900">訂單狀態</h1>
        <button
          onClick={handleSaveImage}
          disabled={saving}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-sm font-medium text-stone-700 transition-colors disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {saving ? "儲存中..." : "存圖"}
        </button>
      </header>

      <main className="flex-1 px-5 py-8 space-y-6 animate-fade-in">
        <div ref={cardRef} className="space-y-6">
          <div className={`text-center ${statusChanged ? "animate-scale-bounce" : ""}`}>
            <p className="text-sm text-stone-500 mb-1">取餐號碼</p>
            <p className="text-4xl sm:text-5xl font-black text-stone-900 tracking-tight">#{displayNumber}</p>
            <div className={`inline-flex items-center gap-1.5 mt-4 px-5 py-2 rounded-full text-sm font-semibold border ${status.bg} ${status.color} transition-all duration-500`}>
              <span>{status.emoji}</span>
              <span>{status.label}</span>
            </div>
          </div>

          {/* Animated progress bar */}
          {order.status !== "cancelled" && (
            <div className="px-2 space-y-3">
              <div className="relative h-2.5 bg-stone-200 rounded-full overflow-hidden">
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
                          : "bg-white border-stone-300 text-stone-400"
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
                        isCurrent ? (i === 3 ? "text-emerald-600" : "text-[#E23D28]") + " font-bold" : isActive ? "text-emerald-500" : "text-stone-400"
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
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
              <p className="text-red-700 font-bold text-lg">訂單已取消</p>
              <p className="text-red-500 text-sm mt-1">如有疑問請至熱食部窗口洽詢</p>
            </div>
          )}

          <div className="card-premium p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">部門</span>
              <span className="font-medium">{deptLabel}</span>
            </div>
            {order.className && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">班級</span>
                <span className="font-medium">{order.className}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">學號</span>
              <span className="font-medium">{order.studentId}</span>
            </div>
            {order.pickupTime && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">取餐時間</span>
                <span className="font-medium">{order.pickupTime}</span>
              </div>
            )}
            {order.note && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">備註</span>
                <span className="font-medium text-orange-600">{order.note}</span>
              </div>
            )}
          </div>

          <div className="card-premium p-5">
            <h3 className="font-semibold text-stone-800 mb-3">訂單內容</h3>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1.5">
                <span className="text-stone-700">{item.name} × {item.quantity}</span>
                <span className="font-medium">${item.price * item.quantity}</span>
              </div>
            ))}
            <div className="border-t border-stone-100 mt-3 pt-3 flex justify-between font-bold text-lg">
              <span>合計</span>
              <span>${order.totalPrice}</span>
            </div>
          </div>

          <p className="text-center text-[10px] text-stone-300 pt-2">內湖高中熱食部 · nhsh-food.vercel.app</p>
        </div>

        {/* Ready banner */}
        {order.status === "ready" && (
          <div className={`bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6 text-center ${showReadyBanner ? "animate-slide-up" : ""}`}>
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-emerald-800 font-bold text-xl">餐點已備好！</p>
            <p className="text-emerald-600 mt-2">請至{deptLabel}取餐</p>
          </div>
        )}

        {/* Picked up message */}
        {order.status === "picked_up" && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 text-center">
            <p className="text-3xl mb-2">🍽️</p>
            <p className="text-amber-800 font-bold text-xl">請享用！</p>
            <p className="text-amber-600 mt-2">感謝您使用內湖高中熱食部線上訂餐</p>
          </div>
        )}
      </main>

      {/* Save reminder toast */}
      {showSaveToast && (
        <div className="fixed bottom-6 inset-x-4 z-50 flex justify-center animate-toast-in">
          <div className="bg-stone-900 text-white rounded-2xl px-5 py-4 shadow-2xl shadow-stone-900/30 flex items-center gap-3 max-w-sm w-full">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">建議保存訂單截圖</p>
              <p className="text-xs text-stone-400 mt-0.5">點擊「存圖」將訂單儲存為圖片</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleSaveImage} className="px-3 py-1.5 bg-white text-stone-900 rounded-lg text-xs font-bold hover:bg-stone-100 transition-colors">存圖</button>
              <button onClick={() => { setShowSaveToast(false); setToastDismissed(true); }} className="px-2 py-1.5 text-stone-500 hover:text-white text-xs transition-colors">略過</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Full-screen "請享用" overlay with countdown → auto redirect to home */
function PickedUpOverlay({ displayNumber, onDone }: { displayNumber: string; onDone: () => void }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) { onDone(); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onDone]);

  return (
    <div className="fixed inset-0 z-[60] bg-[#FFF8F0] flex items-center justify-center" onClick={onDone}>
      <div className="flex flex-col items-center px-8 text-center animate-fade-in">
        <div className="animate-scale-bounce mb-6">
          <span className="text-8xl">🍽️</span>
        </div>
        <p className="text-3xl font-black text-stone-900 animate-float-up">請享用！</p>
        <p className="text-lg text-stone-600 mt-3 animate-float-up" style={{ animationDelay: "0.2s" }}>
          感謝您的訂購
        </p>
        <p className="text-sm text-stone-400 mt-2 animate-float-up" style={{ animationDelay: "0.4s" }}>
          取餐號碼 #{displayNumber}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); onDone(); }}
          className="mt-10 px-8 py-3 bg-[#E23D28] text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all animate-float-up active:scale-95"
          style={{ animationDelay: "0.6s" }}
        >
          回首頁
        </button>
        <p className="text-xs text-stone-400 mt-4 animate-float-up" style={{ animationDelay: "0.8s" }}>
          {countdown} 秒後自動返回首頁
        </p>
      </div>
    </div>
  );
}

// Helper: draw rounded rectangle
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
