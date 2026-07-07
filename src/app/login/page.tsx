"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStudentAuth } from "@/lib/student-auth";
import { IconEye, IconEyeOff, IconSchool } from "@/components/Icons";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/haptic";

export default function LoginPage() {
  const router = useRouter();
  const { setStudent } = useStudentAuth();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const t = useT();
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
      if (!res.ok) { setError(data.error || "登入失敗"); return; }
      haptic([12, 40, 12]);
      setStudent(data);
      setSuccess(true);
      // Hold the checkmark briefly so the redirect feels intentional, not
      // like the form vanished.
      setTimeout(() => router.push("/"), 420);
      return;
    } catch {
      setError("連線失敗，請稍後再試");
    } finally {
      if (!success) setLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm font-medium text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all";

  return (
    <main className="flex-1 flex flex-col px-6 py-12">
      <div className="w-full max-w-sm mx-auto animate-fade-in flex flex-col flex-1">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#E23D28] to-[#FF6B35] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200/50 dark:shadow-red-900/30">
            <IconSchool size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{t("login_title")}</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-2">{t("login_subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">{t("student_id")}</label>
            <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder={t("student_id_placeholder")} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">{t("password")}</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("password_placeholder")} required className={`${inputCls} pr-11`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 font-medium animate-fade-in">
              {error}
            </div>
          )}

          <div className="flex-1 min-h-4" />

          <button type="submit" disabled={loading || success}
            className={`w-full rounded-2xl px-6 py-4 font-bold text-lg shadow-lg shadow-red-200/50 dark:shadow-red-900/30 hover:shadow-xl transition-colors duration-300 active:scale-[0.98] disabled:opacity-90 flex items-center justify-center gap-2 text-white ${success ? "bg-emerald-500" : "bg-[#E23D28] hover:bg-[#c9321f]"}`}>
            {success ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-scale-bounce">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>登入成功</span>
              </>
            ) : loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>{t("login")}中…</span>
              </>
            ) : (
              <span>{t("login")}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {t("first_time")}
            <Link href="/register" className="text-[#E23D28] font-semibold ml-1 hover:underline">{t("register_account")}</Link>
          </p>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            {t("back_to_home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
