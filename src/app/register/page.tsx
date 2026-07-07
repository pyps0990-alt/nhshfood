"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStudentAuth } from "@/lib/student-auth";
import { haptic } from "@/lib/haptic";

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { score, label: "弱", color: "bg-red-500" };
  if (score <= 4) return { score, label: "中等", color: "bg-yellow-500" };
  return { score, label: "強", color: "bg-green-500" };
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

type Role = "student" | "teacher";

export default function RegisterPage() {
  const router = useRouter();
  const { setStudent } = useStudentAuth();
  const [role, setRole] = useState<Role>("student");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [className, setClassName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const pwTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cfTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showPassword) {
      if (pwTimerRef.current) clearTimeout(pwTimerRef.current);
      pwTimerRef.current = setTimeout(() => setShowPassword(false), 5000);
    }
    return () => { if (pwTimerRef.current) clearTimeout(pwTimerRef.current); };
  }, [showPassword]);

  useEffect(() => {
    if (showConfirm) {
      if (cfTimerRef.current) clearTimeout(cfTimerRef.current);
      cfTimerRef.current = setTimeout(() => setShowConfirm(false), 5000);
    }
    return () => { if (cfTimerRef.current) clearTimeout(cfTimerRef.current); };
  }, [showConfirm]);

  const strength = getPasswordStrength(password);

  const pwChecks = [
    { label: "至少 8 個字元", pass: password.length >= 8 },
    { label: "包含大寫英文字母", pass: /[A-Z]/.test(password) },
    { label: "包含小寫英文字母", pass: /[a-z]/.test(password) },
    { label: "包含數字", pass: /[0-9]/.test(password) },
    { label: "包含特殊符號", pass: /[^A-Za-z0-9]/.test(password) },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("兩次密碼輸入不一致");
      return;
    }

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
      if (!res.ok) {
        setError(data.error || "註冊失敗");
        return;
      }
      haptic([12, 40, 12]);
      setStudent(data);
      setSuccess(true);
      setTimeout(() => router.push("/"), 420);
      return;
    } catch {
      setError("連線失敗，請稍後再試");
    } finally {
      if (!success) setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#E23D28] to-[#FF6B35] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200/50 dark:shadow-red-900/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">帳號註冊</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-2">僅限內湖高中師生</p>
        </div>

        {/* Role toggle */}
        <div className="flex gap-2 mb-6 bg-stone-100 dark:bg-stone-800 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              role === "student"
                ? "bg-white dark:bg-stone-700 text-[#E23D28] shadow-sm"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            學生
          </button>
          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              role === "teacher"
                ? "bg-white dark:bg-stone-700 text-[#E23D28] shadow-sm"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            教師
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              {role === "teacher" ? "教師編號" : "學號"} *
            </label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder={role === "teacher" ? "輸入教師編號" : "輸入學號"}
              required
              className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">密碼 *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="輸入密碼"
                required
                className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {/* Password requirements */}
            <div className="mt-2 space-y-1">
              {pwChecks.map((c) => (
                <div key={c.label} className="flex items-center gap-1.5">
                  <span className={`text-xs ${c.pass ? "text-green-500" : "text-stone-300 dark:text-stone-600"}`}>
                    {c.pass ? "✓" : "○"}
                  </span>
                  <span className={`text-xs ${c.pass ? "text-green-600 dark:text-green-400" : "text-stone-400 dark:text-stone-500"}`}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= strength.score ? strength.color : "bg-stone-200 dark:bg-stone-700"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs font-medium ${
                  strength.score <= 2 ? "text-red-500" : strength.score <= 4 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"
                }`}>
                  密碼強度：{strength.label}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">確認密碼 *</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次輸入密碼"
                required
                className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all pr-11"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">密碼不一致</p>
            )}
          </div>

          {role === "student" && (
            <div>
              <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">班級 *</label>
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="例：101"
                required
                className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">姓名 *</label>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="真實姓名"
              required
              className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">暱稱</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="App 內顯示的名稱（選填）"
              maxLength={30}
              className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">學校 Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username@nhsh.tp.edu.tw"
              required
              className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all"
            />
            {email && !email.endsWith("@nhsh.tp.edu.tw") && email.includes("@") && (
              <p className="text-xs text-amber-500 mt-1">僅限學校 Email（@nhsh.tp.edu.tw）</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 font-medium animate-fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className={`w-full rounded-2xl px-6 py-3.5 font-bold shadow-lg shadow-red-200/50 dark:shadow-red-900/30 hover:shadow-xl transition-colors duration-300 active:scale-[0.98] disabled:opacity-90 flex items-center justify-center gap-2 text-white ${success ? "bg-emerald-500" : "bg-[#E23D28] hover:bg-[#c9321f]"}`}
          >
            {success ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-scale-bounce">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>註冊成功</span>
              </>
            ) : loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>註冊中…</span>
              </>
            ) : (
              <span>註冊</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            已有帳號？
            <Link href="/login" className="text-[#E23D28] font-semibold ml-1 hover:underline">
              登入
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
