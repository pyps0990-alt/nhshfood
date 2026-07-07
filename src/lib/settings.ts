"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";
export type Locale = "zh-TW" | "en";
export type NotifyMethod = "email" | "push" | "none";

interface SettingsState {
  theme: Theme;
  locale: Locale;
  notifyMethod: NotifyMethod;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setNotifyMethod: (method: NotifyMethod) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      locale: "zh-TW",
      notifyMethod: "email",
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setNotifyMethod: (notifyMethod) => set({ notifyMethod }),
    }),
    { name: "nhsh-settings" }
  )
);
