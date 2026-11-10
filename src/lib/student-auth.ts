"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";

export interface StudentProfile {
  id: string;
  studentId: string;
  className: string;
  studentName: string;
  displayName?: string;
  email: string;
}

interface StudentAuthState {
  student: StudentProfile | null;
  setStudent: (s: StudentProfile) => void;
  logout: () => void;
}

export const useStudentAuth = create<StudentAuthState>()(
  persist(
    (set) => ({
      student: null,
      setStudent: (student) => set({ student }),
      logout: () => {
        // Clear the server-side session cookie too — clearing localStorage
        // alone would leave the httpOnly cookie valid on the server.
        if (typeof fetch !== "undefined") {
          fetch("/api/student-auth/logout", { method: "POST" }).catch(() => {});
        }
        set({ student: null });
      },
    }),
    {
      name: "nhsh-student",
      partialize: (state) => ({ student: state.student }),
    }
  )
);

/** True once the persisted student profile has been read from localStorage. */
export function useStudentAuthHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useStudentAuth.persist?.onFinishHydration?.(cb) ?? (() => {}),
    () => useStudentAuth.persist?.hasHydrated?.() ?? false,
    // Server snapshot AND the client's hydration render both report false, so
    // effects in the first commit never act on the not-yet-restored profile.
    () => false
  );
}
