"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let res: Response;
    try {
      res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      setError("網路錯誤，請稍後再試");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "登入失敗");
      setLoading(false);
      return;
    }

    // Only follow same-site relative paths (no open redirect).
    const next = new URLSearchParams(window.location.search).get("next") || "";
    router.push(/^\/(admin|pos|receiver)(\/|$)/.test(next) ? next : "/admin/hub");
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold lg-ink tracking-tight">管理員登入</h1>
          <p className="lg-ink-2 text-sm mt-2">內湖高中熱食部管理系統</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold lg-ink mb-2">帳號</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="lg-field w-full text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold lg-ink mb-2">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="lg-field w-full text-sm"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-[22px] px-5 py-3.5 font-semibold disabled:opacity-50 hover:bg-stone-800 dark:hover:bg-stone-200 transition-all duration-200"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
      </div>
    </main>
  );
}
