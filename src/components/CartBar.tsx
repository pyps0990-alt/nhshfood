"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { getDeptConfig } from "@/lib/department";

export function CartBar({ department }: { department: string }) {
  const count = useCart((s) => s.count());
  const total = useCart((s) => s.total());
  const cartDept = useCart((s) => s.department);
  const cfg = getDeptConfig(department);

  if (count === 0 || cartDept !== department) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 p-4 glass border-t border-stone-200/50 animate-slide-up">
      <Link
        href={`/${department}/cart`}
        className={`flex items-center justify-between ${cfg.headerBg} text-white rounded-2xl px-6 py-4 font-semibold shadow-lg hover:shadow-xl transition-all duration-200`}
      >
        <span className="flex items-center gap-2">
          <span className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
            {count}
          </span>
          購物車
        </span>
        <span className="text-lg">${total}</span>
      </Link>
    </div>
  );
}
