"use client";

import { ReactNode, useEffect } from "react";
import { useThemeEffect } from "@/lib/theme";
import { PageTransition } from "./PageTransition";

export default function Providers({ children }: { children: ReactNode }) {
  useThemeEffect();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("SW registration failed:", err);
      });
    }
  }, []);

  return <PageTransition>{children}</PageTransition>;
}
