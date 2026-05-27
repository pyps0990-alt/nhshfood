"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartBar({ department }: { department: string }) {
  const count = useCart((s) => s.count());
  const total = useCart((s) => s.total());
  const cartDept = useCart((s) => s.department);

  if (count === 0 || cartDept !== department) return null;

  const color = department === "breakfast" ? "bg-amber-500" : "bg-orange-500";

  return (
    <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-200">
      <Link
        href={`/${department}/cart`}
        className={`flex items-center justify-between ${color} text-white rounded-xl px-5 py-3 font-medium`}
      >
        <span>購物車 ({count})</span>
        <span>${total}</span>
      </Link>
    </div>
  );
}
