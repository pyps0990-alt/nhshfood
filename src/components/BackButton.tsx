"use client";

import Link from "next/link";

interface BackButtonProps {
  href: string;
  /** "light" for colored headers, "dark" for white/neutral headers */
  variant?: "light" | "dark";
}

export function BackButton({ href, variant = "dark" }: BackButtonProps) {
  const base = "w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0";
  const style = variant === "light"
    ? `${base} bg-white/20 hover:bg-white/30 text-white`
    : `${base} bg-stone-100 hover:bg-stone-200 text-stone-600`;

  return (
    <Link href={href} className={style}>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </Link>
  );
}
