"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStudentAuth } from "@/lib/student-auth";
import { useSettings, type Theme } from "@/lib/settings";

const TOTAL_STEPS = 6;
const FILL_DURATION = 1500;
const DEMO_SEEN_KEY = "nhsh_demo_seen";

/* ── Fill Button ── */
function FillButton({ onReady, label = "下一步" }: { onReady: () => void; label?: string }) {
  // Users who have already seen the demo skip the enforced fill delay entirely.
  const initiallyReady = typeof window !== "undefined" && localStorage.getItem(DEMO_SEEN_KEY) === "1";
  const [progress, setProgress] = useState(initiallyReady ? 1 : 0);
  const [ready, setReady] = useState(initiallyReady);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (ready) return;
    startRef.current = performance.now();
    function tick() {
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(elapsed / FILL_DURATION, 1);
      setProgress(p);
      if (p >= 1) {
        setReady(true);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      onClick={ready ? onReady : undefined}
      disabled={!ready}
      className={`relative mt-8 w-full max-w-xs h-14 rounded-2xl font-bold text-lg overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 ${
        ready
          ? "bg-white text-[#E23D28] shadow-xl active:scale-[0.97] cursor-pointer"
          : "bg-white/20 text-white/40 cursor-not-allowed"
      }`}
    >
      {!ready && (
        <div
          className="absolute inset-0 bg-white/30 rounded-2xl transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}
const INPUT_CLASS = "w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-sm font-medium text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/50 transition-all";
const LABEL_CLASS = "block text-sm font-semibold text-white/90 mb-1.5";

/* ── Progress Bar ── */
function ProgressBar({ step, onSkip }: { step: number; onSkip: () => void }) {
  return (
    <div className="px-6 pt-4 pb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/50 text-xs font-medium">{step} / {TOTAL_STEPS}</span>
        <button onClick={onSkip} className="text-white/40 text-xs font-medium hover:text-white/70 transition-colors">
          跳過
        </button>
      </div>
      <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ── Step 1: Welcome ── */
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="w-24 h-24 bg-white/15 backdrop-blur rounded-3xl flex items-center justify-center mb-8 shadow-xl">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
        </svg>
      </div>
      <h1 className="text-3xl font-black text-white text-center mb-3">歡迎使用</h1>
      <h2 className="text-2xl font-black text-white text-center mb-4">內湖高中熱食部</h2>
      <p className="text-white/60 text-center text-sm leading-relaxed max-w-xs">
        線上點餐，下課直接取。<br/>只需幾個步驟，即可開始使用。
      </p>
      <button
        onClick={onNext}
        className="mt-10 w-full max-w-xs h-14 rounded-2xl font-bold text-lg bg-white text-[#E23D28] shadow-xl active:scale-[0.97] transition-all duration-150 ob-btn-hint"
      >
        開始
      </button>
    </div>
  );
}

/* ── Step 2: Demo Welcome ── */
function DemoWelcome() {
  const [pulse, setPulse] = useState(false);
  useEffect(() => { const t = setTimeout(() => setPulse(true), 800); return () => clearTimeout(t); }, []);

  return (
    <div className="relative w-64 h-[24rem] bg-[#FFFAF5] rounded-[2rem] shadow-2xl overflow-hidden mx-auto border border-white/20">
      <div className="bg-white/90 backdrop-blur-sm border-b border-stone-200/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-[#E23D28] to-[#FF6B35] rounded-full flex items-center justify-center text-white text-[8px] font-bold">王</div>
            <div>
              <div className="text-[10px] font-bold text-stone-800">王小明</div>
              <div className="text-[7px] text-stone-400">101 · S11201</div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 text-[8px] text-amber-600 font-semibold px-1.5 py-0.5 rounded bg-amber-50">$150</div>
        </div>
      </div>
      <div className="px-4 pt-4">
        <div className="text-sm font-black text-stone-900 mb-3">內湖高中熱食部</div>
        <div className="flex flex-col gap-2">
          <div className={`flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-red-50 to-orange-50 border border-red-200/60 rounded-xl transition-all duration-700 ${pulse ? "ob-card-pulse" : ""}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E23D28" strokeWidth="1.5"><path d="M17 11H3a1 1 0 01-1-1 8 8 0 018-8h8a1 1 0 011 1 8 8 0 01-2 5.3"/><path d="M21 10.5c.5.5 1 1.6 1 2.5a4 4 0 01-4 4H6"/><path d="M3 21h18"/><path d="M3 17h18"/></svg>
            <div className="text-xs font-bold text-[#E23D28]">早餐部</div>
          </div>
          <div className={`flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/60 rounded-xl transition-all duration-700 ${pulse ? "ob-card-pulse" : ""}`} style={{ animationDelay: "0.3s" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="1.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
            <div className="text-xs font-bold text-[#FF6B35]">午餐部</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 3: Demo Menu ── */
function DemoMenu() {
  const [added, setAdded] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setAdded(true), 1400);
    const t2 = setTimeout(() => setAdded(false), 3200);
    const interval = setInterval(() => {
      setTimeout(() => setAdded(true), 0);
      setTimeout(() => setAdded(false), 1800);
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(interval); };
  }, []);

  return (
    <div className="relative w-64 h-[24rem] bg-[#FFFAF5] rounded-[2rem] shadow-2xl overflow-hidden mx-auto border border-white/20">
      <div className="bg-gradient-to-r from-[#E23D28] to-[#FF6B35] px-3 py-2.5 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        <span className="text-white text-[11px] font-bold">早餐部</span>
      </div>
      <div className="px-3 pt-2.5 flex gap-1">
        <div className="px-2.5 py-0.5 bg-red-50 border border-red-200 rounded-full text-[9px] text-[#E23D28] font-bold">全部</div>
        <div className="px-2.5 py-0.5 bg-stone-100 rounded-full text-[9px] text-stone-400">主食</div>
        <div className="px-2.5 py-0.5 bg-stone-100 rounded-full text-[9px] text-stone-400">飲料</div>
      </div>
      <div className="px-3 pt-2.5 space-y-1.5">
        <div className={`bg-white rounded-lg p-2.5 border transition-all duration-300 ${added ? "border-emerald-300 bg-emerald-50/50" : "border-stone-100"}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-stone-800">培根蛋餅</div>
              <div className="text-xs font-black text-stone-900 mt-0.5">$40</div>
            </div>
            <button className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all duration-300 ${added ? "bg-emerald-500 text-white" : "bg-[#E23D28] text-white"}`}>
              {added ? "已加入" : "+ 加入"}
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg p-2.5 border border-stone-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-stone-800">總匯三明治</div>
              <div className="text-xs font-black text-stone-900 mt-0.5">$50</div>
            </div>
            <button className="px-3 py-1 rounded-lg bg-[#E23D28] text-white text-[9px] font-bold">+ 加入</button>
          </div>
        </div>
        <div className="bg-white rounded-lg p-2.5 border border-stone-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-stone-800">大冰奶</div>
              <div className="text-xs font-black text-stone-900 mt-0.5">$25</div>
            </div>
            <button className="px-3 py-1 rounded-lg bg-[#E23D28] text-white text-[9px] font-bold">+ 加入</button>
          </div>
        </div>
      </div>
      {added && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-[#E23D28] to-[#FF6B35] mx-2.5 mb-2.5 rounded-xl px-3 py-2.5 flex items-center justify-between ob-cart-slide-up">
          <span className="text-white text-[10px] font-bold">購物車</span>
          <span className="bg-white/25 rounded-full w-4 h-4 flex items-center justify-center text-white text-[9px] font-bold">1</span>
        </div>
      )}
    </div>
  );
}

/* ── Step 4: Registration Form ── */
function StepRegister({ onSuccess, onLogin }: { onSuccess: () => void; onLogin: () => void }) {
  const { setStudent } = useStudentAuth();
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [className, setClassName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const pwChecks = [
    { label: "8+ 字元", pass: password.length >= 8 },
    { label: "大寫", pass: /[A-Z]/.test(password) },
    { label: "小寫", pass: /[a-z]/.test(password) },
    { label: "數字", pass: /[0-9]/.test(password) },
    { label: "符號", pass: /[^A-Za-z0-9]/.test(password) },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("兩次密碼不一致"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/student-auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentId.trim(),
          password,
          className: role === "teacher" ? "教師" : className.trim(),
          studentName: studentName.trim(),
          displayName: displayName.trim() || undefined,
          email: email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "註冊失敗"); return; }
      setStudent(data);
      onSuccess();
    } catch {
      setError("連線失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28 animate-fade-in">
      <div className="max-w-sm mx-auto pt-4">
        <h2 className="text-xl font-black text-white mb-1">建立你的帳號</h2>
        <p className="text-white/50 text-sm mb-5">僅限內湖高中師生</p>

        {/* Role toggle */}
        <div className="flex gap-2 mb-5 bg-white/10 rounded-2xl p-1">
          {(["student", "teacher"] as const).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                role === r ? "bg-white text-[#E23D28] shadow-sm" : "text-white/50"
              }`}
            >
              {r === "student" ? "學生" : "教師"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={LABEL_CLASS}>{role === "teacher" ? "教師編號" : "學號"}</label>
            <input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder={role === "teacher" ? "輸入教師編號" : "輸入學號"} required className={INPUT_CLASS} />
          </div>

          {role === "student" && (
            <div>
              <label className={LABEL_CLASS}>班級</label>
              <input value={className} onChange={e => setClassName(e.target.value)} placeholder="例：101" required className={INPUT_CLASS} />
            </div>
          )}

          <div>
            <label className={LABEL_CLASS}>真實姓名</label>
            <input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="用於訂單核對" required className={INPUT_CLASS} />
          </div>

          <div>
            <label className={LABEL_CLASS}>暱稱 <span className="text-white/30 font-normal">（選填）</span></label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="App 內顯示的名稱" maxLength={30} className={INPUT_CLASS} />
          </div>

          <div>
            <label className={LABEL_CLASS}>學校 Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="username@nhsh.tp.edu.tw" required className={INPUT_CLASS} />
            {email && !email.endsWith("@nhsh.tp.edu.tw") && email.includes("@") && (
              <p className="text-xs text-amber-300 mt-1">僅限學校 Email（@nhsh.tp.edu.tw）</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>密碼</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="設定密碼" required className={`${INPUT_CLASS} pr-11`} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showPw ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>}
                </svg>
              </button>
            </div>
            {password && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {pwChecks.map(c => (
                  <span key={c.label} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.pass ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/30"}`}>
                    {c.pass ? "v " : ""}{c.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>確認密碼</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再次輸入密碼" required className={INPUT_CLASS} />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-300 mt-1">密碼不一致</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-sm text-red-200 font-medium animate-fade-in">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full h-14 rounded-2xl font-bold text-lg bg-white text-[#E23D28] shadow-xl active:scale-[0.97] transition-all duration-150 disabled:opacity-50 mt-2">
            {loading ? "註冊中..." : "註冊帳號"}
          </button>
        </form>

        <div className="text-center pt-4 pb-6">
          <p className="text-white/50 text-sm">
            已經有帳號了？
            <button type="button" onClick={onLogin} className="text-white font-bold underline underline-offset-2 ml-1 hover:text-white/80 transition-colors">
              登入
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Step 5: Permissions ── */
function StepPermissions({ onNext }: { onNext: () => void }) {
  const [locStatus, setLocStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">("idle");

  async function requestLocation() {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      if (pos) setLocStatus("granted");
    } catch {
      setLocStatus("denied");
    }
  }

  async function requestNotification() {
    if (!("Notification" in window)) { setNotifStatus("denied"); return; }
    const result = await Notification.requestPermission();
    setNotifStatus(result === "granted" ? "granted" : "denied");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center mb-4">
          <h2 className="text-xl font-black text-white mb-1">需要一些權限</h2>
          <p className="text-white/50 text-sm">確保 App 正常運作</p>
        </div>

        {/* Location */}
        <button
          onClick={requestLocation}
          disabled={locStatus !== "idle"}
          className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 ${
            locStatus === "granted"
              ? "bg-emerald-500/20 border-emerald-400/40"
              : locStatus === "denied"
              ? "bg-red-500/10 border-red-400/30"
              : "bg-white/10 border-white/20 active:scale-[0.98]"
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            locStatus === "granted" ? "bg-emerald-500/30" : locStatus === "denied" ? "bg-red-500/20" : "bg-white/15"
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div className="text-left flex-1">
            <p className="text-white font-bold text-sm">定位權限</p>
            <p className="text-white/40 text-xs mt-0.5">
              {locStatus === "granted" ? "已允許" : locStatus === "denied" ? "已拒絕，可稍後於設定開啟" : "用於確認您在校園範圍內下單"}
            </p>
          </div>
          {locStatus === "granted" && (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          )}
        </button>

        {/* Notification */}
        <button
          onClick={requestNotification}
          disabled={notifStatus !== "idle"}
          className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 ${
            notifStatus === "granted"
              ? "bg-emerald-500/20 border-emerald-400/40"
              : notifStatus === "denied"
              ? "bg-red-500/10 border-red-400/30"
              : "bg-white/10 border-white/20 active:scale-[0.98]"
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            notifStatus === "granted" ? "bg-emerald-500/30" : notifStatus === "denied" ? "bg-red-500/20" : "bg-white/15"
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </div>
          <div className="text-left flex-1">
            <p className="text-white font-bold text-sm">通知權限</p>
            <p className="text-white/40 text-xs mt-0.5">
              {notifStatus === "granted" ? "已允許" : notifStatus === "denied" ? "已拒絕，可稍後於設定開啟" : "接收取餐提醒和訂單狀態更新"}
            </p>
          </div>
          {notifStatus === "granted" && (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          )}
        </button>

        <FillButton onReady={onNext} label={locStatus === "idle" && notifStatus === "idle" ? "稍後再說" : "下一步"} />
      </div>
    </div>
  );
}

/* ── Step 6: Personalization ── */
function StepPersonalize({ onFinish }: { onFinish: () => void }) {
  const { setTheme, setNotifyMethod } = useSettings();
  const [selectedTheme, setSelectedTheme] = useState<Theme>("system");
  const [notify, setNotify] = useState<"push" | "email" | "none">("push");

  function pickTheme(t: Theme) {
    setSelectedTheme(t);
    setTheme(t);
  }

  function handleFinish() {
    setNotifyMethod(notify);
    onFinish();
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h2 className="text-xl font-black text-white mb-1">最後一步</h2>
          <p className="text-white/50 text-sm">打造你的專屬體驗</p>
        </div>

        {/* Theme */}
        <div>
          <h4 className="text-white font-bold text-sm mb-3">外觀主題</h4>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: "light" as Theme, label: "淺色", bg: "bg-[#FFF8F0]", cardBg: "bg-white", textColor: "text-stone-800" },
              { value: "dark" as Theme, label: "深色", bg: "bg-stone-900", cardBg: "bg-stone-800", textColor: "text-stone-300" },
              { value: "system" as Theme, label: "跟隨系統", bg: "bg-gradient-to-b from-[#FFF8F0] to-stone-900", cardBg: "bg-white/50", textColor: "text-stone-600" },
            ]).map(t => (
              <button
                key={t.value}
                onClick={() => pickTheme(t.value)}
                className={`flex flex-col items-center gap-2 transition-all duration-200 ${
                  selectedTheme === t.value ? "scale-105" : "opacity-50 hover:opacity-70"
                }`}
              >
                <div className={`w-full aspect-[3/4] rounded-xl border-2 overflow-hidden ${
                  selectedTheme === t.value ? "border-white shadow-lg shadow-white/20" : "border-transparent"
                }`}>
                  <div className={`h-full ${t.bg} p-2`}>
                    <div className="h-2 w-8 bg-[#E23D28] rounded mb-1.5" />
                    <div className={`${t.cardBg} rounded p-1.5 mb-1`}>
                      <div className={`h-1 w-6 rounded ${t.textColor === "text-stone-300" ? "bg-stone-600" : "bg-stone-200"}`} />
                    </div>
                    <div className={`${t.cardBg} rounded p-1.5`}>
                      <div className={`h-1 w-4 rounded ${t.textColor === "text-stone-300" ? "bg-stone-600" : "bg-stone-200"}`} />
                    </div>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold ${selectedTheme === t.value ? "text-white" : "text-white/50"}`}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Notification */}
        <div>
          <h4 className="text-white font-bold text-sm mb-3">取餐通知方式</h4>
          <div className="flex gap-2">
            {([
              { value: "push" as const, label: "推播通知" },
              { value: "email" as const, label: "Email" },
              { value: "none" as const, label: "不通知" },
            ]).map(n => (
              <button
                key={n.value}
                onClick={() => setNotify(n.value)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  notify === n.value
                    ? "bg-white text-[#E23D28] shadow-lg"
                    : "bg-white/10 text-white/50 hover:bg-white/15"
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
          <p className="text-white/30 text-[11px] text-center mt-2">
            {notify === "push" ? "餐點完成時手機即時推播提醒" : notify === "email" ? "餐點完成時發送 Email 通知" : "不接收訂單狀態通知"}
          </p>
        </div>

        <button
          onClick={handleFinish}
          className="w-full h-14 rounded-2xl font-bold text-lg bg-white text-[#E23D28] shadow-xl active:scale-[0.97] transition-all duration-150"
        >
          開始使用
        </button>
      </div>
    </div>
  );
}

/* ── Main Onboarding ── */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (localStorage.getItem("nhsh_onboarded")) {
      router.replace("/");
    }
  }, [router]);

  function next() {
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
    contentRef.current?.scrollTo(0, 0);
  }

  function skip() {
    localStorage.setItem("nhsh_onboarded", "1");
    localStorage.setItem(DEMO_SEEN_KEY, "1");
    router.replace("/login");
  }

  function finish() {
    localStorage.setItem("nhsh_onboarded", "1");
    localStorage.setItem(DEMO_SEEN_KEY, "1");
    router.replace("/");
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#E23D28] to-[#FF6B35]">
      <ProgressBar step={step} onSkip={skip} />

      <div ref={contentRef} className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {step === 1 && <StepWelcome onNext={next} />}

        {step === 2 && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
            <div className="mb-5">
              <DemoWelcome />
            </div>
            <h2 className="text-xl font-black text-white text-center mb-1">選擇餐部，瀏覽菜單</h2>
            <p className="text-white/60 text-sm text-center">點選早餐部或午餐部開始點餐</p>
            <FillButton onReady={next} />
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
            <div className="mb-5">
              <DemoMenu />
            </div>
            <h2 className="text-xl font-black text-white text-center mb-1">一鍵加入購物車</h2>
            <p className="text-white/60 text-sm text-center">選好想吃的，確認後送出訂單</p>
            <FillButton onReady={next} />
          </div>
        )}

        {step === 4 && <StepRegister onSuccess={next} onLogin={skip} />}

        {step === 5 && <StepPermissions onNext={next} />}

        {step === 6 && <StepPersonalize onFinish={finish} />}
      </div>
    </div>
  );
}
