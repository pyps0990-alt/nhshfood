"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStudentAuth } from "@/lib/student-auth";
import { BackButton } from "@/components/BackButton";

export default function ProfilePage() {
  const router = useRouter();
  const { student, setStudent, logout } = useStudentAuth();
  const [studentName, setStudentName] = useState("");
  const [email, setEmail] = useState("");
  const [className, setClassName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!student) {
      router.push("/login");
      return;
    }
    setStudentName(student.studentName);
    setEmail(student.email);
    setClassName(student.className);
  }, [student, router]);

  if (!student) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const payload: Record<string, string> = {
        studentId: student!.studentId,
      };

      if (studentName !== student!.studentName) payload.studentName = studentName;
      if (email !== student!.email) payload.email = email;
      if (className !== student!.className) payload.className = className;

      if (changingPassword) {
        if (!currentPassword) {
          setMessage({ type: "error", text: "請輸入目前密碼" });
          setSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setMessage({ type: "error", text: "新密碼與確認密碼不符" });
          setSaving(false);
          return;
        }
        if (newPassword) {
          payload.currentPassword = currentPassword;
          payload.newPassword = newPassword;
        }
      }

      const hasProfileChanges = Object.keys(payload).length > 1;
      const hasPasswordChange = !!payload.newPassword;

      if (!hasProfileChanges && !hasPasswordChange) {
        setMessage({ type: "error", text: "沒有任何變更" });
        setSaving(false);
        return;
      }

      const res = await fetch("/api/student-auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "更新失敗" });
        setSaving(false);
        return;
      }

      setStudent({
        id: student!.id,
        studentId: student!.studentId,
        studentName: data.studentName,
        email: data.email,
        className: data.className,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangingPassword(false);
      setMessage({ type: "success", text: "個人資料已更新" });
    } catch {
      setMessage({ type: "error", text: "網路錯誤，請稍後再試" });
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="glass border-b border-stone-200/50 px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <BackButton href="/" />
        <h1 className="text-lg font-bold text-stone-900">個人設定</h1>
      </header>

      <main className="flex-1 px-5 py-8 max-w-lg mx-auto w-full">
        <div className="card-premium p-6 mb-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#E23D28] to-[#FF6B35] rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-white">{student.studentName[0]}</span>
            </div>
            <p className="font-bold text-lg text-stone-900">{student.studentName}</p>
            <p className="text-sm text-stone-500">{student.className}班 · {student.studentId}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="card-premium p-5 space-y-4">
            <h2 className="font-bold text-stone-800">基本資料</h2>

            <div>
              <label className="text-sm font-medium text-stone-600 mb-1 block">學號</label>
              <input type="text" value={student.studentId} disabled
                className="w-full px-4 py-3 bg-stone-100 rounded-xl text-stone-500 cursor-not-allowed" />
            </div>

            <div>
              <label className="text-sm font-medium text-stone-600 mb-1 block">姓名</label>
              <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#E23D28]/20 focus:border-[#E23D28] outline-none transition-all" />
            </div>

            <div>
              <label className="text-sm font-medium text-stone-600 mb-1 block">班級</label>
              <input type="text" value={className} onChange={(e) => setClassName(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#E23D28]/20 focus:border-[#E23D28] outline-none transition-all" />
            </div>

            <div>
              <label className="text-sm font-medium text-stone-600 mb-1 block">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#E23D28]/20 focus:border-[#E23D28] outline-none transition-all" />
            </div>
          </div>

          <div className="card-premium p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-800">變更密碼</h2>
              <button type="button" onClick={() => setChangingPassword(!changingPassword)}
                className="text-sm text-[#E23D28] font-medium">
                {changingPassword ? "取消" : "修改密碼"}
              </button>
            </div>

            {changingPassword && (
              <div className="space-y-3">
                <div className="relative">
                  <label className="text-sm font-medium text-stone-600 mb-1 block">目前密碼</label>
                  <input type={showCurrentPw ? "text" : "password"} value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#E23D28]/20 focus:border-[#E23D28] outline-none transition-all pr-12" />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-9 text-stone-400 hover:text-stone-600">
                    {showCurrentPw ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <label className="text-sm font-medium text-stone-600 mb-1 block">新密碼</label>
                  <input type={showNewPw ? "text" : "password"} value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#E23D28]/20 focus:border-[#E23D28] outline-none transition-all pr-12" />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-9 text-stone-400 hover:text-stone-600">
                    {showNewPw ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>

                <div>
                  <label className="text-sm font-medium text-stone-600 mb-1 block">確認新密碼</label>
                  <input type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#E23D28]/20 focus:border-[#E23D28] outline-none transition-all" />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">密碼不一致</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium ${
              message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {message.text}
            </div>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-gradient-to-r from-[#E23D28] to-[#FF6B35] text-white rounded-2xl py-4 font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50">
            {saving ? "儲存中..." : "儲存變更"}
          </button>

          <button type="button" onClick={handleLogout}
            className="w-full text-red-500 hover:text-red-600 text-sm font-medium py-3 transition-colors">
            登出帳號
          </button>
        </form>
      </main>
    </div>
  );
}
