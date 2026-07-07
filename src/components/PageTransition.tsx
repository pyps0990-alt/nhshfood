"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState, type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      setEntering(true);
      const id = requestAnimationFrame(() => setEntering(false));
      return () => cancelAnimationFrame(id);
    }
  }, [pathname]);

  return (
    <div
      className="flex-1 flex flex-col"
      style={{
        viewTransitionName: "page-content",
        animation: entering ? "page-enter 0.3s cubic-bezier(0.22, 1, 0.36, 1) both" : undefined,
      }}
    >
      {children}
    </div>
  );
}
