"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      logout: () => set({ student: null }),
    }),
    {
      name: "nhsh-student",
      partialize: (state) => ({ student: state.student }),
    }
  )
);
