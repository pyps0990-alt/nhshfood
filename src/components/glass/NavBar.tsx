"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface NavBarProps {
  title: ReactNode;
  subtitle?: ReactNode;
  backHref?: string;
  onBack?: () => void;
  right?: ReactNode;
  /** "clear" frosts on scroll (iOS default); "smoke" is dark glass for admin/POS. */
  variant?: "clear" | "smoke";
  /** Show an iOS large title below the bar that collapses into it on scroll. */
  large?: boolean;
  className?: string;
}

/** Glass navigation bar: transparent at rest, frosted once content scrolls beneath. */
export function NavBar({ title, subtitle, backHref, onBack, right, variant = "clear", large = false, className = "" }: NavBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const smoke = variant === "smoke";
  const showInlineTitle = !large || scrolled;

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="h-px -mb-px" />
      <header
        data-scrolled={scrolled || smoke ? "true" : "false"}
        className={`lg-nav ${smoke ? "lg-smoke" : ""} ${className}`}
      >
        <div className="max-w-5xl mx-auto h-[52px] px-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center min-w-0">
            {(backHref || onBack) && <BackButton href={backHref} onClick={onBack} smoke={smoke} />}
          </div>
          <div
            className={`text-center min-w-0 transition-all duration-300 ${showInlineTitle ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
          >
            <div className={`text-[17px] font-semibold truncate ${smoke ? "text-white" : "lg-ink"}`}>{title}</div>
            {subtitle && !large && (
              <div className={`text-[11px] font-medium truncate ${smoke ? "text-white/60" : "lg-ink-3"}`}>{subtitle}</div>
            )}
          </div>
          <div className="flex items-center justify-end gap-1.5 min-w-0">{right}</div>
        </div>
      </header>
      {large && (
        <div className="max-w-5xl mx-auto w-full px-5 pt-1 pb-2">
          <h1 className={`lg-large-title ${smoke ? "text-white" : "lg-ink"}`}>{title}</h1>
          {subtitle && <p className={`mt-1 text-[15px] font-medium ${smoke ? "text-white/60" : "lg-ink-2"}`}>{subtitle}</p>}
        </div>
      )}
    </>
  );
}

export function BackButton({ href, onClick, smoke = false }: { href?: string; onClick?: () => void; smoke?: boolean }) {
  const cls = `lg-btn lg-btn-icon ${smoke ? "bg-white/10 text-white" : "lg-thin lg-ink"} !min-h-[38px] !w-[38px]`;
  const icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
  if (onClick) return <button type="button" onClick={onClick} aria-label="返回" className={cls}>{icon}</button>;
  return <Link href={href || "/"} aria-label="返回" className={cls}>{icon}</Link>;
}

export function IconButton({ href, onClick, label, children, smoke = false }: { href?: string; onClick?: () => void; label: string; children: ReactNode; smoke?: boolean }) {
  const cls = `lg-btn lg-btn-icon ${smoke ? "bg-white/10 text-white" : "lg-thin lg-ink-2"} !min-h-[38px] !w-[38px]`;
  if (href) return <Link href={href} aria-label={label} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} aria-label={label} className={cls}>{children}</button>;
}
