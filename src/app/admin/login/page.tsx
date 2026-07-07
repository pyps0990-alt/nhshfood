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

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "登入失敗");
      setLoading(false);
      return;
    }

    router.push("/admin/hub");
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">管理員登入</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-2">內湖高中熱食部管理系統</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">帳號</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 focus:border-transparent shadow-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 focus:border-transparent shadow-sm"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl px-5 py-3.5 font-semibold disabled:opacity-50 hover:bg-stone-800 dark:hover:bg-stone-200 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
      </div>
    </main>
  );
}
