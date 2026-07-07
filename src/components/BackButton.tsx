"use client";

import Link from "next/link";

interface BackButtonProps {
  href: string;
  variant?: "light" | "dark";
}

export function BackButton({ href, variant = "dark" }: BackButtonProps) {
  const base = "w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150 shrink-0 active:scale-90";
  const style = variant === "light"
    ? `${base} bg-white/20 hover:bg-white/30 active:bg-white/40 text-white`
    : `${base} bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:bg-stone-300 dark:active:bg-stone-600 text-stone-600 dark:text-stone-400`;

  return (
    <Link href={href} className={style}>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </Link>
  );
}
