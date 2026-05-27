import Link from "next/link";
import { OrderLookup } from "@/components/OrderLookup";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">內湖高中熱食部</h1>
      <p className="text-gray-500 mb-10">線上訂餐系統</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
        <Link
          href="/breakfast"
          className="flex flex-col items-center gap-3 p-8 bg-amber-50 border-2 border-amber-200 rounded-2xl hover:border-amber-400 hover:shadow-lg transition-all"
        >
          <span className="text-5xl">🥪</span>
          <span className="text-xl font-semibold text-amber-900">早餐部</span>
          <span className="text-sm text-amber-600">早上～下午供應</span>
        </Link>

        <Link
          href="/lunch"
          className="flex flex-col items-center gap-3 p-8 bg-orange-50 border-2 border-orange-200 rounded-2xl hover:border-orange-400 hover:shadow-lg transition-all"
        >
          <span className="text-5xl">🍱</span>
          <span className="text-xl font-semibold text-orange-900">午餐部</span>
          <span className="text-sm text-orange-600">11:00 ~ 13:00</span>
        </Link>
      </div>

      <div className="mt-10 w-full max-w-lg">
        <OrderLookup />
      </div>
    </main>
  );
}
