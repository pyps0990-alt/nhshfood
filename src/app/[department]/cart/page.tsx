"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function CartPage() {
  const { department } = useParams<{ department: string }>();
  const router = useRouter();
  const { items, updateQty, remove, total, clear, department: cartDept } = useCart();

  const color = department === "breakfast" ? "amber" : "orange";
  const totalPrice = total();

  if (cartDept !== department || items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <p className="text-gray-400 mb-4">購物車是空的</p>
        <Link href={`/${department}`} className={`text-${color}-500 font-medium`}>
          回去看菜單
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className={`sticky top-0 z-10 bg-${color}-500 text-white px-4 py-3 flex items-center gap-3`}>
        <Link href={`/${department}`} className="text-xl">←</Link>
        <h1 className="text-lg font-bold">購物車</h1>
        <button onClick={() => { clear(); router.push(`/${department}`); }} className="ml-auto text-sm opacity-80">
          清空
        </button>
      </header>

      <main className="flex-1 px-4 py-4 pb-32">
        <div className="space-y-3">
          {items.map((ci) => (
            <div key={ci.menuItem.id} className="bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100">
              <div className="flex-1">
                <p className="font-semibold">{ci.menuItem.name}</p>
                <p className="text-sm text-gray-500">${ci.menuItem.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(ci.menuItem.id, ci.quantity - 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
                >
                  −
                </button>
                <span className="w-6 text-center font-medium">{ci.quantity}</span>
                <button
                  onClick={() => updateQty(ci.menuItem.id, ci.quantity + 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <button onClick={() => remove(ci.menuItem.id)} className="text-red-400 text-sm ml-2">
                刪除
              </button>
            </div>
          ))}
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-200">
        <div className="flex justify-between mb-3 text-lg font-bold">
          <span>合計</span>
          <span>${totalPrice}</span>
        </div>
        <Link
          href={`/${department}/order`}
          className={`block text-center bg-${color}-500 text-white rounded-xl px-5 py-3 font-medium`}
        >
          前往結帳
        </Link>
      </div>
    </div>
  );
}
