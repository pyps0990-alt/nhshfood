"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const links: {
  href: string;
  label: string;
  desc: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    href: "/admin",
    label: "訂單管理",
    desc: "查看與處理今日訂單",
    color: "from-[#E23D28] to-[#FF6B35]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    href: "/admin/menu",
    label: "菜單管理",
    desc: "新增、編輯、刪除餐點",
    color: "from-[#f97316] to-[#f59e0b]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
      </svg>
    ),
  },
  {
    href: "/admin/students",
    label: "名冊管理",
    desc: "新增或刪除學生名冊",
    color: "from-[#0ea5e9] to-[#3b82f6]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    href: "/admin/pickup-slots",
    label: "取餐時段",
    desc: "設定各部門可選時段",
    color: "from-[#8b5cf6] to-[#a855f7]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: "/admin/analytics",
    label: "數據分析",
    desc: "營收、備餐時間統計",
    color: "from-[#2563eb] to-[#6366f1]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    href: "/admin/wallet",
    label: "錢包管理",
    desc: "儲值紀錄與餘額調整",
    color: "from-[#f59e0b] to-[#eab308]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/>
      </svg>
    ),
  },
  {
    href: "/pos",
    label: "POS 收銀",
    desc: "現場點餐與收款",
    color: "from-[#10b981] to-[#22c55e]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16"/>
      </svg>
    ),
  },
  {
    href: "/receiver",
    label: "收餐畫面",
    desc: "廚房出餐提示看板",
    color: "from-[#57534e] to-[#44403c]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
];

export default function AdminHubPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="flex-1 flex flex-col bg-stone-50 dark:bg-stone-950">
      <header className="bg-stone-900 text-white px-5 py-4 flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight flex-1">管理總覽</h1>
        <button onClick={handleLogout} className="text-sm bg-stone-800 hover:bg-stone-700 px-3 py-2 rounded-xl transition-colors">
          登出
        </button>
      </header>

      <main className="flex-1 px-5 py-6 max-w-2xl mx-auto w-full">
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">選擇要前往的管理功能</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col gap-3 p-4 rounded-2xl bg-gradient-to-br ${l.color} shadow-md hover:shadow-lg active:scale-[0.97] transition-all duration-150`}
            >
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                {l.icon}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{l.label}</p>
                <p className="text-white/70 text-[11px] mt-0.5 leading-snug">{l.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
