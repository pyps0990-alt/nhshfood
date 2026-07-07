"use client";

import { useState } from "react";
import Link from "next/link";
import { useSettings, type Theme, type Locale, type NotifyMethod } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { useStudentAuth } from "@/lib/student-auth";
import { BackButton } from "@/components/BackButton";
import { MemberBarcode } from "@/components/MemberBarcode";
import {
  IconSun, IconMoon, IconMonitor, IconGlobe, IconUser,
  IconChevronRight, IconLogOut, IconBarcode,
} from "@/components/Icons";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push-client";
import { useExitAnimation } from "@/lib/useExitAnimation";

const themeOptions: { value: Theme; icon: typeof IconSun; label: string }[] = [
  { value: "light", icon: IconSun, label: "theme_light" },
  { value: "dark", icon: IconMoon, label: "theme_dark" },
  { value: "system", icon: IconMonitor, label: "theme_system" },
];

const localeOptions: { value: Locale; label: string; sub: string }[] = [
  { value: "zh-TW", label: "繁體中文", sub: "Traditional Chinese" },
  { value: "en", label: "English", sub: "英文" },
];

export default function SettingsPage() {
  const { theme, locale, notifyMethod, setTheme, setLocale, setNotifyMethod } = useSettings();
  const { student, logout, setStudent } = useStudentAuth();
  const t = useT();
  const [pushError, setPushError] = useState("");
  const [notifySaved, setNotifySaved] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const { mounted: pushPromptMounted, closing: pushPromptClosing } = useExitAnimation(showPushPrompt, 200);
  const [nickname, setNickname] = useState(student?.displayName || "");
  const [nickSaving, setNickSaving] = useState(false);
  const [nickSaved, setNickSaved] = useState(false);
  const [nickError, setNickError] = useState("");
  const [showNickInput, setShowNickInput] = useState(false);

  async function handleNotifyChange(method: NotifyMethod) {
    setPushError("");
    setNotifySaved(false);
    if (method === "push") {
      if (!student) {
        setPushError("請先登入才能啟用推播通知");
        return;
      }
      setShowPushPrompt(true);
      return;
    }
    if (notifyMethod === "push" && student) {
      await unsubscribeFromPush(student.studentId);
    }
    if (student) {
      fetch("/api/push/subscribe", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.studentId, notifyMethod: method }),
      }).catch(() => {});
    }
    setNotifyMethod(method);
    setNotifySaved(true);
    setTimeout(() => setNotifySaved(false), 2000);
  }

  async function confirmPush() {
    if (!student) return;
    setShowPushPrompt(false);
    setPushError("");
    const result = await subscribeToPush(student.studentId);
    if (!result.ok) {
      setPushError(result.reason || "推播通知啟用失敗");
      return;
    }
    if (notifyMethod === "push" && student) {
      await unsubscribeFromPush(student.studentId);
    }
    setNotifyMethod("push");
    setNotifySaved(true);
    setTimeout(() => setNotifySaved(false), 2000);
  }

  async function saveNickname() {
    if (!student || !nickname.trim()) return;
    setNickSaving(true);
    setNickError("");
    try {
      const res = await fetch("/api/student-auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.studentId, displayName: nickname.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setNickError(data.error || "儲存失敗");
        setNickSaving(false);
        return;
      }
      const data = await res.json();
      setStudent({ ...student, displayName: data.displayName });
      setNickSaved(true);
      setShowNickInput(false);
      setTimeout(() => setNickSaved(false), 2000);
    } catch {
      setNickError("網路錯誤");
    }
    setNickSaving(false);
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="glass dark:bg-stone-900/85 border-b border-stone-200/50 dark:border-stone-800 px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <BackButton href="/" />
        <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">{t("settings")}</h1>
      </header>

      <main className="flex-1 px-5 py-6 max-w-lg mx-auto w-full space-y-5 stagger-children">
        {/* Member Card */}
        {student && (
          <div className="card-premium overflow-hidden">
            <div className="bg-gradient-to-br from-[#E23D28] to-[#FF6B35] p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold shrink-0">
                  {(student.displayName || student.studentName).charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-lg truncate">{student.displayName || student.studentName}</p>
                  <p className="text-white/70 text-sm truncate">{student.className} · {student.studentId}</p>
                </div>
                <button
                  onClick={() => setShowBarcode(!showBarcode)}
                  className="shrink-0 p-2 rounded-lg bg-white/15 hover:bg-white/25 active:scale-90 transition-all duration-150"
                  aria-label="顯示條碼"
                >
                  <IconBarcode size={18} />
                </button>
              </div>
              {showBarcode && (
                <div className="bg-white rounded-lg p-3 mt-4 animate-fade-in">
                  <MemberBarcode value={student.studentId} height={48} className="text-stone-900" />
                  <p className="text-center text-stone-500 text-xs font-mono mt-1.5 tracking-widest">{student.studentId}</p>
                </div>
              )}
            </div>
            <div className="p-3 space-y-1">
              {/* Nickname editing */}
              {showNickInput ? (
                <div className="p-3 space-y-2.5">
                  <label className="text-xs font-medium text-stone-500 dark:text-stone-400">暱稱</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="輸入你想顯示的名稱"
                    maxLength={30}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 outline-none focus:border-[#E23D28] transition-colors"
                  />
                  {nickError && <p className="text-xs text-red-500">{nickError}</p>}
                  {nickSaved && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 animate-fade-in">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      已儲存
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowNickInput(false); setNickname(student?.displayName || ""); setNickError(""); }}
                      className="flex-1 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                    >取消</button>
                    <button
                      onClick={saveNickname}
                      disabled={nickSaving || !nickname.trim()}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#E23D28] to-[#FF6B35] text-white text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-all"
                    >{nickSaving ? "儲存中..." : "儲存"}</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNickInput(true)}
                  className="flex items-center gap-2 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 active:bg-stone-100 dark:active:bg-stone-700 transition-colors w-full text-left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500 shrink-0">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-stone-700 dark:text-stone-300">暱稱</span>
                    <span className="text-xs text-stone-400 ml-2">{student?.displayName || "尚未設定"}</span>
                  </div>
                  <IconChevronRight size={14} className="text-stone-300 shrink-0" />
                </button>
              )}
              <Link href="/profile" className="flex items-center gap-2 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 active:bg-stone-100 dark:active:bg-stone-700 transition-colors">
                <IconUser size={16} className="text-stone-500" />
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300 truncate">{t("profile")}</span>
                <IconChevronRight size={14} className="text-stone-300 ml-auto shrink-0" />
              </Link>
            </div>
          </div>
        )}

        {/* Nickname prompt for existing users */}
        {student && !student.displayName && !showNickInput && (
          <button
            onClick={() => setShowNickInput(true)}
            className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl animate-fade-in"
          >
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">設定你的暱稱</p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">讓大家知道怎麼稱呼你</p>
            </div>
            <IconChevronRight size={16} className="text-amber-400 shrink-0" />
          </button>
        )}

        {/* Theme */}
        <div className="card-premium p-5">
          <h2 className="font-bold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
            <IconSun size={16} className="text-stone-500" />
            {t("dark_mode")}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                    theme === opt.value
                      ? "border-[#E23D28] bg-red-50 dark:bg-red-950/30"
                      : "border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600"
                  }`}
                >
                  <Icon size={22} className={theme === opt.value ? "text-[#E23D28]" : "text-stone-500 dark:text-stone-400"} />
                  <span className={`text-xs font-medium ${theme === opt.value ? "text-[#E23D28]" : "text-stone-600 dark:text-stone-400"}`}>
                    {t(opt.label)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language */}
        <div className="card-premium p-5">
          <h2 className="font-bold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
            <IconGlobe size={16} className="text-stone-500" />
            {t("language")}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {localeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLocale(opt.value)}
                className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200 ${
                  locale === opt.value
                    ? "border-[#E23D28] bg-red-50 dark:bg-red-950/30"
                    : "border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600"
                }`}
              >
                <span className={`text-sm font-semibold ${locale === opt.value ? "text-[#E23D28]" : "text-stone-700 dark:text-stone-300"}`}>
                  {opt.label}
                </span>
                <span className="text-[11px] text-stone-400 mt-0.5">{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="card-premium p-5">
          <h2 className="font-bold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {t("notifications") || "通知方式"}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "email" as NotifyMethod, label: "Email", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              )},
              { value: "push" as NotifyMethod, label: "APP", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18"/>
                </svg>
              )},
              { value: "none" as NotifyMethod, label: "關閉", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              )},
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleNotifyChange(opt.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  notifyMethod === opt.value
                    ? "border-[#E23D28] bg-red-50 dark:bg-red-950/30"
                    : "border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600"
                }`}
              >
                <span className={notifyMethod === opt.value ? "text-[#E23D28]" : "text-stone-500 dark:text-stone-400"}>
                  {opt.icon}
                </span>
                <span className={`text-xs font-medium ${notifyMethod === opt.value ? "text-[#E23D28]" : "text-stone-600 dark:text-stone-400"}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          {pushError && (
            <p className="mt-3 text-xs text-red-500 text-center">{pushError}</p>
          )}
          {notifySaved && !pushError && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              已儲存
            </div>
          )}
          <p className="mt-3 text-[11px] text-stone-400 dark:text-stone-500 text-center">
            {notifyMethod === "email" ? "訂單狀態更新時將發送 Email 通知" :
             notifyMethod === "push" ? "訂單狀態更新時將發送推播通知" :
             "已關閉訂單通知"}
          </p>
        </div>

        {/* Test Notification */}
        {student && notifyMethod !== "none" && (
          <div className="card-premium p-5">
            <h2 className="font-bold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
              </svg>
              測試通知
            </h2>
            <button
              onClick={async () => {
                if (notifyMethod === "push" && "Notification" in window && Notification.permission === "granted") {
                  new Notification("測試通知", { body: "推播通知正常運作中！", icon: "/icon-192x192.png" });
                } else if (notifyMethod === "email") {
                  try {
                    const res = await fetch("/api/notify", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ studentId: student.studentId, type: "test" }),
                    });
                    if (res.ok) alert("測試 Email 已發送！");
                    else alert("發送失敗，請稍後再試");
                  } catch { alert("網路錯誤"); }
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 hover:border-[#E23D28] dark:hover:border-[#E23D28] text-stone-700 dark:text-stone-300 hover:text-[#E23D28] text-sm font-medium transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              發送測試{notifyMethod === "push" ? "推播" : " Email"}通知
            </button>
          </div>
        )}

        {/* Location */}
        <div className="card-premium p-5">
          <h2 className="font-bold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            定位設定
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">定位服務</p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">下單時用於確認在校園範圍內</p>
            </div>
            <button
              onClick={async () => {
                if (!navigator.geolocation) { alert("此裝置不支援定位"); return; }
                try {
                  await new Promise<GeolocationPosition>((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
                  );
                  alert("定位權限已開啟");
                } catch (e) {
                  const err = e as GeolocationPositionError;
                  if (err.code === 1) alert("定位權限被拒絕，請在瀏覽器設定中開啟");
                  else alert("無法取得定位");
                }
              }}
              className="px-4 py-2 rounded-xl border-2 border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-[#E23D28] hover:text-[#E23D28] transition-all"
            >
              檢查權限
            </button>
          </div>
        </div>

        {/* Admin Contact */}
        <div className="card-premium p-5">
          <h2 className="font-bold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            {t("contact_admin") || "聯繫管理員"}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://www.instagram.com/cyj._.1231"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-stone-200 dark:border-stone-700 hover:border-purple-400 dark:hover:border-purple-600 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
              <span className="text-xs font-medium text-stone-600 dark:text-stone-400">Instagram</span>
            </a>
            <a
              href="mailto:pyps0990@gmail.com"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-stone-200 dark:border-stone-700 hover:border-red-400 dark:hover:border-red-600 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>
              </svg>
              <span className="text-xs font-medium text-stone-600 dark:text-stone-400">Gmail</span>
            </a>
          </div>
        </div>

        {/* Logout */}
        {student && (
          <button
            onClick={() => { logout(); }}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-sm font-medium"
          >
            <IconLogOut size={16} />
            {t("logout")}
          </button>
        )}

        <p className="text-center text-xs text-stone-400 dark:text-stone-600 pt-2">
          &copy; 2025 內湖高中熱食部 v2.0
        </p>
      </main>

      {pushPromptMounted && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowPushPrompt(false)}>
          <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${pushPromptClosing ? "animate-backdrop-out" : "animate-backdrop-in"}`} />
          <div className={`relative w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden ${pushPromptClosing ? "animate-modal-out" : "animate-modal-in"}`} onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#E23D28] to-[#FF6B35] rounded-2xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200 mb-2">
                不再錯過取餐時間
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                開啟推播通知後，訂單確認、餐點完成時會即時提醒你，不用一直重新整理頁面
              </p>
            </div>
            <div className="px-6 pb-6 space-y-2">
              <button
                onClick={confirmPush}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E23D28] to-[#FF6B35] text-white font-semibold shadow-lg active:scale-[0.98] transition-all duration-150"
              >
                好，開啟通知
              </button>
              <button
                onClick={() => setShowPushPrompt(false)}
                className="w-full py-3 rounded-xl text-stone-500 dark:text-stone-400 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                先不用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

