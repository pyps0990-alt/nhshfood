"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";
export type Locale = "zh-TW" | "en";
export type NotifyMethod = "email" | "push" | "none";
/** iOS 27-style Liquid Glass intensity: ultra clear → fully tinted, or off. */
export type GlassLevel = "clear" | "regular" | "tinted" | "off";

interface SettingsState {
  theme: Theme;
  locale: Locale;
  notifyMethod: NotifyMethod;
  glass: GlassLevel;
  setGlass: (g: GlassLevel) => void;
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
      glass: "regular",
      setGlass: (glass) => set({ glass }),
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setNotifyMethod: (notifyMethod) => set({ notifyMethod }),
    }),
    { name: "nhsh-settings" }
  )
);
