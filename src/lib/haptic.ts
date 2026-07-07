"use client";

export function haptic(pattern: number | number[] = 10) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try { navigator.vibrate(pattern); } catch {}
}
