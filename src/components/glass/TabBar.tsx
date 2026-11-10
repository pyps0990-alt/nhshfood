"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TABS = [
  {
    href: "/",
    label: "首頁",
    icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/orders",
    label: "訂單",
    icon: <><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  },
  {
    href: "/wallet",
    label: "錢包",
    icon: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M16 15h2" /></>,
  },
  {
    href: "/settings",
    label: "設定",
    icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  },
] as const;

/**
 * Floating Liquid Glass tab bar (iOS 26/27). Minimizes when the user
 * scrolls down to give content more room, and expands on scroll up.
 */
export function TabBar() {
  const pathname = usePathname();
  const [minimized, setMinimized] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      if (Math.abs(dy) < 6) return;
      setMinimized(dy > 0 && y > 80);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeIndex = Math.max(0, TABS.findIndex((t) => (t.href === "/" ? pathname === "/" : pathname.startsWith(t.href))));

  return (
    <nav
      aria-label="主要導覽"
      data-min={minimized}
      className="ios-tabbar lg-glass lg-materialize"
      style={{ "--tab-count": TABS.length, "--tab-index": activeIndex } as React.CSSProperties}
    >
      <span className="ios-tabbar-lens" aria-hidden="true" />
      {TABS.map((t, i) => {
        const active = i === activeIndex;
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className="ios-tab" data-active={active}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {t.icon}
            </svg>
            <span className="ios-tab-label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
