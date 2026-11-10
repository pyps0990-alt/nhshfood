"use client";

import type { CSSProperties } from "react";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`lg-seg ${className}`}
      style={{ "--seg-count": options.length, "--seg-index": index } as CSSProperties}
    >
      <span className="lg-seg-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
