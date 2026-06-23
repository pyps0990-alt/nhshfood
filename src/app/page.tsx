"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrderLookup } from "@/components/OrderLookup";
import { useStudentAuth } from "@/lib/student-auth";

export default function Home() {
  const router = useRouter();
  const { student, logout } = useStudentAuth();

  function handleDeptClick(dept: string) {
    if (!student) {
      router.push("/login");
      return;
    }
    router.push(`/${dept}`);
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      {/* Student bar */}
      {student ? (
        <div className="w-full max-w-lg mb-6 animate-fade-in">
          <div className="flex items-center justify-between bg-white border border-stone-200 rounded-2xl px-5 py-3 shadow-sm">
            <Link href="/profile" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#E23D28] to-[#FF6B35] rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {student.studentName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-stone-800">{student.studentName}</p>
                <p className="text-xs text-stone-400">{student.className}班 · {student.studentId}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 ml-1"><path d="M9 18l6-6-6-6"/></svg>
            </Link>
            <button
              onClick={logout}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              登出
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-lg mb-6 animate-fade-in">
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 bg-white border border-stone-200 rounded-2xl px-5 py-3.5 shadow-sm hover:shadow-md hover:border-[#E23D28]/30 transition-all"
          >
            <span className="text-lg">🏫</span>
            <span className="text-sm font-semibold text-stone-700">登入學生帳號開始訂餐</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E23D28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </Link>
        </div>
      )}

      <div className="animate-fade-in text-center mb-12">
        <p className="text-sm font-medium tracking-widest text-stone-400 uppercase mb-3">
          Neihu Senior High School
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight">
          內湖高中熱食部
        </h1>
        <p className="text-stone-500 mt-3 text-lg">線上訂餐系統</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-lg animate-slide-up">
        <button
          onClick={() => handleDeptClick("breakfast")}
          className="group relative flex flex-col items-center gap-4 p-10 bg-gradient-to-br from-red-50 to-orange-50 border border-red-200/60 rounded-2xl hover:border-red-300 hover:shadow-xl hover:shadow-red-100/50 transition-all duration-300"
        >
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300">🥪</span>
          <div className="text-center">
            <span className="text-xl font-bold text-[#E23D28]">早餐部</span>
            <p className="text-sm text-red-500/70 mt-1">早上～下午供應</p>
          </div>
          {!student && (
            <span className="absolute top-3 right-3 text-[10px] bg-stone-800 text-white px-2 py-0.5 rounded-full font-bold">
              需登入
            </span>
          )}
        </button>

        <button
          onClick={() => handleDeptClick("lunch")}
          className="group relative flex flex-col items-center gap-4 p-10 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/60 rounded-2xl hover:border-orange-300 hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-300"
        >
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300">🍱</span>
          <div className="text-center">
            <span className="text-xl font-bold text-[#FF6B35]">午餐部</span>
            <p className="text-sm text-orange-500/70 mt-1">11:00 ~ 13:00</p>
          </div>
          {!student && (
            <span className="absolute top-3 right-3 text-[10px] bg-stone-800 text-white px-2 py-0.5 rounded-full font-bold">
              需登入
            </span>
          )}
        </button>
      </div>

      <div className="mt-12 w-full max-w-lg animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <OrderLookup />
      </div>

      <footer className="mt-16 text-xs text-stone-400">
        © 2025 內湖高中熱食部
      </footer>
    </main>
  );
}
