"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<"enter" | "idle">("enter");
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      // New page — play enter animation
      prevPath.current = pathname;
      setDisplayChildren(children);
      setPhase("enter");
      const t = setTimeout(() => setPhase("idle"), 350);
      return () => clearTimeout(t);
    } else {
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  return (
    <div
      className={`flex-1 flex flex-col ${phase === "enter" ? "animate-page-enter" : ""}`}
      key={pathname}
    >
      {displayChildren}
    </div>
  );
}
