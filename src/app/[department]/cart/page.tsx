"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { getDeptConfig } from "@/lib/department";

export default function CartPage() {
  const { department } = useParams<{ department: string }>();
  const router = useRouter();
  const { items, updateQty, remove, total, clear, department: cartDept } = useCart();
  const cfg = getDeptConfig(department);
  const totalPrice = total();

  if (cartDept !== department || items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-stone-400 mb-4 text-lg">購物車是空的</p>
        <Link href={`/${department}`} className={`${cfg.btnText} font-semibold text-lg`}>
          回去看菜單 →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className={`sticky top-0 z-10 bg-gradient-to-r ${department === "breakfast" ? "from-amber-500 to-amber-600" : "from-orange-500 to-red-500"} text-white px-5 py-4 flex items-center gap-3 shadow-md`}>
        <Link href={`/${department}`} className="text-xl hover:opacity-80 transition-opacity">←</Link>
        <h1 className="text-lg font-bold tracking-tight">購物車</h1>
        <button onClick={() => { clear(); router.push(`/${department}`); }} className="ml-auto text-sm opacity-80 hover:opacity-100 transition-opacity">
          清空
        </button>
      </header>

      <main className="flex-1 px-5 py-5 pb-36">
        <div className="space-y-3">
          {items.map((ci) => (
            <div key={ci.menuItem.id} className="card-premium p-5 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-stone-900">{ci.menuItem.name}</p>
                <p className="text-sm text-stone-500 mt-0.5">${ci.menuItem.price}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateQty(ci.menuItem.id, ci.quantity - 1)}
                  className="w-9 h-9 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-lg hover:bg-stone-200 transition-colors"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold text-lg">{ci.quantity}</span>
                <button
                  onClick={() => updateQty(ci.menuItem.id, ci.quantity + 1)}
                  className="w-9 h-9 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-lg hover:bg-stone-200 transition-colors"
                >
                  +
                </button>
              </div>
              <button onClick={() => remove(ci.menuItem.id)} className="text-red-400 text-sm ml-2 hover:text-red-500 transition-colors">
                刪除
              </button>
            </div>
          ))}
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 p-5 glass border-t border-stone-200/50">
        <div className="flex justify-between mb-4 text-lg font-bold text-stone-900">
          <span>合計</span>
          <span>${totalPrice}</span>
        </div>
        <Link
          href={`/${department}/order`}
          className={`block text-center ${cfg.btnBg} text-white rounded-2xl px-6 py-4 font-semibold shadow-lg hover:shadow-xl transition-all duration-200`}
        >
          前往結帳
        </Link>
      </div>
    </div>
  );
}
