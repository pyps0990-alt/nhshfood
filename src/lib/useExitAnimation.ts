"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Keeps a conditionally-rendered element mounted for `duration` ms after
 * `open` flips to false, so its exit animation can finish before removal.
 */
export function useExitAnimation(open: boolean, duration = 250) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      timerRef.current = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { mounted, closing };
}
