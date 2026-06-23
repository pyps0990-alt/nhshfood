"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStudentAuth } from "@/lib/student-auth";

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
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
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
          email: email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "註冊失敗");
        return;
      }
      setStudent(data);
      router.push("/");
    } catch {
      setError("連線失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#E23D28] to-[#FF6B35] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200/50">
            <span className="text-3xl">📝</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">帳號註冊</h1>
          <p className="text-stone-500 text-sm mt-2">僅限內湖高中師生</p>
        </div>

        {/* Role toggle */}
        <div className="flex gap-2 mb-6 bg-stone-100 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              role === "student"
                ? "bg-white text-[#E23D28] shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            學生
          </button>
          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              role === "teacher"
                ? "bg-white text-[#E23D28] shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            教師
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              {role === "teacher" ? "教師編號" : "學號"} *
            </label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder={role === "teacher" ? "輸入教師編號" : "輸入學號"}
              required
              className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">密碼 *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="輸入密碼"
                required
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {/* Password requirements */}
            <div className="mt-2 space-y-1">
              {pwChecks.map((c) => (
                <div key={c.label} className="flex items-center gap-1.5">
                  <span className={`text-xs ${c.pass ? "text-green-500" : "text-stone-300"}`}>
                    {c.pass ? "✓" : "○"}
                  </span>
                  <span className={`text-xs ${c.pass ? "text-green-600" : "text-stone-400"}`}>
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
                        i <= strength.score ? strength.color : "bg-stone-200"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs font-medium ${
                  strength.score <= 2 ? "text-red-500" : strength.score <= 4 ? "text-yellow-600" : "text-green-600"
                }`}>
                  密碼強度：{strength.label}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">確認密碼 *</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次輸入密碼"
                required
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all pr-11"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
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
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">班級 *</label>
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="例：101"
                required
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">姓名 *</label>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="真實姓名"
              required
              className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="用於接收訂單通知"
              required
              className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium animate-fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E23D28] hover:bg-[#c9321f] text-white rounded-2xl px-6 py-3.5 font-bold shadow-lg shadow-red-200/50 hover:shadow-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "註冊中..." : "註冊"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-stone-500">
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
