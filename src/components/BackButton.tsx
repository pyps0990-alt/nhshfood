"use client";

import Link from "next/link";

interface BackButtonProps {
  href: string;
  variant?: "light" | "dark";
}

/** Legacy API kept for older pages; renders the glass back button. */
export function BackButton({ href, variant = "dark" }: BackButtonProps) {
  const cls =
    variant === "light"
      ? "lg-btn lg-btn-icon !w-[38px] !min-h-[38px] bg-white/20 text-white"
      : "lg-btn lg-btn-icon !w-[38px] !min-h-[38px] lg-thin lg-ink";
  return (
    <Link href={href} aria-label="返回" className={cls}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  );
}
