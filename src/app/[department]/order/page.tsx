"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { getDeptConfig } from "@/lib/department";
import { createOrderSecure } from "@/lib/hooks";
import { BackButton } from "@/components/BackButton";
import { useStudentAuth } from "@/lib/student-auth";

type Phase = "idle" | "step1" | "step2" | "step3" | "done";

export default function OrderPage() {
  const { department } = useParams<{ department: string }>();
  const router = useRouter();
  const { items, total, clear, department: cartDept } = useCart();
  const cfg = getDeptConfig(department);
  const { student } = useStudentAuth();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");

  // Auto-fill from student profile
  useEffect(() => {
    if (student) {
      setStudentId(student.studentId);
      setStudentName(student.studentName);
      setClassName(student.className);
    }
  }, [student]);
  const [note, setNote] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupSlots, setPickupSlots] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Fetch configurable pickup slots
  useEffect(() => {
    fetch("/api/settings/pickup-slots")
      .then((r) => r.json())
      .then((data) => {
        const key = department === "breakfast" ? "breakfast" : "lunch";
        setPickupSlots(data[key] || []);
      })
      .catch(() => {});
  }, [department]);

  // Default pickup date to today
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setPickupDate(`${yyyy}-${mm}-${dd}`);
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [orderResult, setOrderResult] = useState<{ id: string; orderNumber: string } | null>(null);

  const totalPrice = total();

  // Snapshot items before cart clears
  const [snapshot, setSnapshot] = useState<{ items: typeof items; total: number } | null>(null);

  // Stable confetti positions (avoid SSR/hydration mismatch with Math.random)
  const confettiPositions = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => ({
      left: 10 + (i * 37 + 13) % 80,
      top: 15 + (i * 23 + 7) % 30,
      color: ["#E23D28", "#FF6B35", "#10b981", "#3b82f6", "#f59e0b"][i % 5],
      delay: i * 0.08,
      duration: 1.2 + (i % 3) * 0.4,
    })),
  []);

  // Require login
  if (!student && phase === "idle") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-stone-600 mb-4 text-lg font-medium">請先登入學生帳號</p>
        <Link href="/login" className="bg-[#E23D28] text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all">
          前往登入
        </Link>
      </div>
    );
  }

  if (cartDept !== department || (items.length === 0 && phase === "idle")) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-stone-400 mb-4 text-lg">購物車是空的</p>
        <Link href={`/${department}`} className={`${cfg.btnText} font-semibold`}>
          回去看菜單 →
        </Link>
      </div>
    );
  }

  const pickupOptions = pickupSlots;

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId.trim()) { setError("請填寫座號"); return; }

    setSubmitting(true);
    setError("");
    setSnapshot({ items: [...items], total: totalPrice });

    // Step 1: sending
    setPhase("step1");

    try {
      const [order] = await Promise.all([
        createOrderSecure({
          studentId: studentId.trim(),
          studentName: studentName.trim() || null,
          className: className.trim() || null,
          department,
          note: note.trim() || null,
          pickupDate: pickupDate || null,
          pickupTime: pickupTime || null,
          items: items.map((i) => ({
            menuItemId: i.menuItem.id,
            name: i.menuItem.name,
            quantity: i.quantity,
            price: i.menuItem.price,
          })),
        }),
        wait(1400),
      ]);

      // Step 2: verifying
      setPhase("step2");
      await wait(900);

      // Step 3: success
      setOrderResult(order);
      clear();
      setPhase("step3");
      await wait(2200);

      // Navigate
      setPhase("done");
      await wait(300);
      router.push(`/order/${order.id}`);
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "訂單送出失敗，請稍後再試");
      setSubmitting(false);
    }
  }

  const inputClass = `w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 ${cfg.ringColor} focus:border-transparent shadow-sm transition-all`;

  const displayNum = orderResult
    ? (orderResult.orderNumber.length > 6 ? orderResult.orderNumber.slice(-4) : orderResult.orderNumber)
    : "";

  // Full-screen overlay
  if (phase !== "idle") {
    return (
      <div className="fixed inset-0 z-50 bg-[#FFF8F0] flex items-center justify-center">
        <div className="flex flex-col items-center px-8 max-w-sm w-full">

          {/* Step 1 & 2: Loading */}
          {(phase === "step1" || phase === "step2") && (
            <div className="flex flex-col items-center animate-fade-in" key={phase}>
              {/* Animated food icon */}
              <div className="relative w-28 h-28 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-[#E23D28]/20" />
                <svg className="absolute inset-0 w-28 h-28 animate-spin" style={{ animationDuration: "3s" }} viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="52" fill="none" stroke="#E23D28" strokeWidth="4" strokeDasharray="80 240" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  {phase === "step1" ? "📤" : "🔍"}
                </div>
              </div>

              {/* Steps indicator */}
              <div className="flex items-center gap-2 mb-6">
                {["送出", "驗證", "完成"].map((label, i) => {
                  const stepIdx = phase === "step1" ? 0 : 1;
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                        i < stepIdx ? "bg-emerald-500 text-white" :
                        i === stepIdx ? "bg-[#E23D28] text-white scale-110 shadow-lg shadow-red-200" :
                        "bg-stone-200 text-stone-400"
                      }`}>
                        {i < stepIdx ? "✓" : i + 1}
                      </div>
                      <span className={`text-xs font-medium ${i === stepIdx ? "text-[#E23D28]" : "text-stone-400"}`}>{label}</span>
                      {i < 2 && <div className={`w-6 h-0.5 ${i < stepIdx ? "bg-emerald-500" : "bg-stone-200"}`} />}
                    </div>
                  );
                })}
              </div>

              <p className="text-lg font-bold text-stone-800">
                {phase === "step1" ? "正在送出訂單..." : "驗證訂單中..."}
              </p>
              <p className="text-sm text-stone-500 mt-2">請勿關閉頁面</p>

              {/* Mini order preview */}
              {snapshot && (
                <div className="mt-8 w-full bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
                  {snapshot.items.slice(0, 3).map((ci, i) => (
                    <div key={i} className="flex justify-between text-sm text-stone-600 py-0.5">
                      <span>{ci.menuItem.name} × {ci.quantity}</span>
                      <span className="font-medium">${ci.menuItem.price * ci.quantity}</span>
                    </div>
                  ))}
                  {snapshot.items.length > 3 && (
                    <p className="text-xs text-stone-400 mt-1">...還有 {snapshot.items.length - 3} 項</p>
                  )}
                  <div className="border-t border-stone-100 mt-2 pt-2 flex justify-between font-bold text-stone-800">
                    <span>合計</span><span>${snapshot.total}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Success! */}
          {phase === "step3" && (
            <div className="flex flex-col items-center relative">
              {/* Confetti */}
              <div className="absolute inset-0 -top-20 -left-20 -right-20 pointer-events-none overflow-hidden" style={{ height: 300 }}>
                {confettiPositions.map((c, i) => (
                  <div
                    key={i}
                    className="absolute w-2.5 h-2.5 rounded-full"
                    style={{
                      left: `${c.left}%`,
                      top: `${c.top}%`,
                      backgroundColor: c.color,
                      animation: `confetti-fall ${c.duration}s ease-out ${c.delay}s both`,
                    }}
                  />
                ))}
              </div>

              {/* Check circle */}
              <div className="animate-scale-bounce mb-6">
                <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-200">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M12 25 L20 33 L36 15" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="animate-check-draw" />
                  </svg>
                </div>
              </div>

              <p className="text-2xl font-bold text-stone-900 animate-float-up">
                訂單送出成功！
              </p>

              <div className="animate-float-up mt-4" style={{ animationDelay: "0.15s" }}>
                <p className="text-5xl font-black tracking-tight" style={{ color: "#E23D28" }}>
                  #{displayNum}
                </p>
              </div>

              <p className="text-stone-500 mt-3 text-sm animate-float-up" style={{ animationDelay: "0.3s" }}>
                請記住你的取餐號碼
              </p>

              <div className="animate-float-up mt-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-center" style={{ animationDelay: "0.5s" }}>
                <p className="text-amber-800 text-sm font-medium">即將跳轉至訂單追蹤頁面...</p>
              </div>
            </div>
          )}

          {/* Done: tiny spinner */}
          {phase === "done" && (
            <div className="flex flex-col items-center animate-fade-in">
              <div className="w-6 h-6 border-2 border-stone-300 border-t-[#E23D28] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className={`sticky top-0 z-10 bg-gradient-to-r ${department === "breakfast" ? "from-[#E23D28] to-[#d63520]" : "from-[#FF6B35] to-[#E23D28]"} text-white px-5 py-4 flex items-center gap-3 shadow-md`}>
        <BackButton href={`/${department}/cart`} variant="light" />
        <h1 className="text-lg font-bold tracking-tight">填寫訂單資料</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 px-5 py-6 space-y-5 pb-36">
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">座號 *</label>
          <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="例：15" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">姓名</label>
          <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="選填" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">班級</label>
          <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="例：高二忠班" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">取餐日期</label>
          <input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">取餐時段</label>
          <div className="flex flex-wrap gap-2">
            {pickupOptions.length === 0 ? (
              <p className="text-sm text-stone-400">載入中...</p>
            ) : pickupOptions.map((t) => (
              <button key={t} type="button" onClick={() => setPickupTime(t)}
                className={`px-4 py-2 rounded-xl text-sm border transition-all duration-200 ${
                  pickupTime === t ? cfg.selectedBtn + " shadow-md" : "border-stone-200 text-stone-600 hover:bg-stone-50 bg-white"
                }`}
              >{t}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">付款方式</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: "cash", label: "現金", enabled: true },
              { key: "easycard", label: "悠遊卡", enabled: false },
              { key: "credit", label: "信用卡", enabled: false },
              { key: "linepay", label: "LINE Pay", enabled: false },
            ] as const).map((pm) => (
              <button
                key={pm.key} type="button" disabled={!pm.enabled}
                onClick={() => pm.enabled && setPaymentMethod(pm.key)}
                className={`relative px-4 py-3 rounded-xl text-sm border transition-all duration-200 ${
                  !pm.enabled
                    ? "border-stone-200 text-stone-300 bg-stone-50 cursor-not-allowed"
                    : paymentMethod === pm.key
                    ? cfg.selectedBtn + " shadow-md"
                    : "border-stone-200 text-stone-600 hover:bg-stone-50 bg-white"
                }`}
              >
                {pm.label}
                {!pm.enabled && (
                  <span className="absolute -top-2 -right-2 bg-stone-400 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    即將推出
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">備註</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：不要辣、加大飯量" rows={2} className={inputClass} />
        </div>

        <div className="card-premium p-5">
          <h3 className="font-semibold text-stone-800 mb-3">訂單內容</h3>
          {items.map((ci) => (
            <div key={ci.menuItem.id} className="flex justify-between text-sm py-1.5">
              <span className="text-stone-700">{ci.menuItem.name} × {ci.quantity}</span>
              <span className="font-medium">${ci.menuItem.price * ci.quantity}</span>
            </div>
          ))}
          <div className="border-t border-stone-100 mt-3 pt-3 flex justify-between font-bold text-lg">
            <span>合計</span><span>${totalPrice}</span>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

        <div className="fixed bottom-0 inset-x-0 p-5 glass border-t border-stone-200/50">
          <button type="submit" disabled={submitting}
            className={`w-full ${cfg.btnBg} text-white rounded-2xl px-6 py-4 font-semibold disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98]`}
          >
            {submitting ? "送出中..." : `送出訂單（$${totalPrice}）`}
          </button>
        </div>
      </form>
    </div>
  );
}
