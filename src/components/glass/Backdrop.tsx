"use client";
import { useEffect } from "react";

/** Mute the warm wallpaper on admin screens so data reads first. */
export function AdminBackdrop() {
  useEffect(() => {
    const el = document.querySelector(".lg-backdrop");
    el?.setAttribute("data-variant", "admin");
    return () => el?.removeAttribute("data-variant");
  }, []);
  return null;
}
