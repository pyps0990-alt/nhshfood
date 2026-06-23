"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStudentAuth } from "@/lib/student-auth";

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

export default function LoginPage() {
  const router = useRouter();
  const { setStudent } = useStudentAuth();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showPassword) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowPassword(false), 5000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [showPassword]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/student-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentId.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "登入失敗");
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
            <span className="text-3xl">🏫</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">登入</h1>
          <p className="text-stone-500 text-sm mt-2">內湖高中熱食部線上訂餐</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">學號 / 教師編號</label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="輸入學號或教師編號"
              required
              className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">密碼</label>
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
            {loading ? "登入中..." : "登入"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-stone-500">
            第一次使用？
            <Link href="/register" className="text-[#E23D28] font-semibold ml-1 hover:underline">
              註冊帳號
            </Link>
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            返回首頁
          </Link>
        </div>
      </div>
    </main>
  );
}
