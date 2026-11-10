"use client";

import { ReactNode, useEffect } from "react";
import { useThemeEffect } from "@/lib/theme";
import { PageTransition } from "./PageTransition";
import { useStudentAuth, useStudentAuthHydrated } from "@/lib/student-auth";

export default function Providers({ children }: { children: ReactNode }) {
  useThemeEffect();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("SW registration failed:", err);
      });
    }
  }, []);

  // Keep the cached profile in sync with the server session. If the session
  // cookie expired or was invalidated (e.g. key rotation), clear the stale
  // local profile so the UI asks the student to sign in again instead of
  // failing at checkout.
  const hydrated = useStudentAuthHydrated();
  const hasStudent = useStudentAuth((s) => !!s.student);
  useEffect(() => {
    if (!hydrated || !hasStudent) return;
    fetch("/api/student-auth/me", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401 || r.status === 404) {
          useStudentAuth.setState({ student: null });
        } else if (r.ok) {
          const fresh = await r.json();
          useStudentAuth.getState().setStudent(fresh);
        }
      })
      .catch(() => {});
  }, [hydrated, hasStudent]);

  return <PageTransition>{children}</PageTransition>;
}
