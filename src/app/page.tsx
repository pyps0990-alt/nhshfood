import Link from "next/link";
import { OrderLookup } from "@/components/OrderLookup";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
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
        <Link
          href="/breakfast"
          className="group relative flex flex-col items-center gap-4 p-10 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl hover:border-amber-300 hover:shadow-xl hover:shadow-amber-100/50 transition-all duration-300"
        >
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300">🥪</span>
          <div className="text-center">
            <span className="text-xl font-bold text-amber-900">早餐部</span>
            <p className="text-sm text-amber-600/80 mt-1">早上～下午供應</p>
          </div>
        </Link>

        <Link
          href="/lunch"
          className="group relative flex flex-col items-center gap-4 p-10 bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200/60 rounded-2xl hover:border-orange-300 hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-300"
        >
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300">🍱</span>
          <div className="text-center">
            <span className="text-xl font-bold text-orange-900">午餐部</span>
            <p className="text-sm text-orange-600/80 mt-1">11:00 ~ 13:00</p>
          </div>
        </Link>
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
