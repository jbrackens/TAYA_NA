"use client";

import React from "react";
import type { CSSProperties } from "react";

interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

const cx = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

type CssVars = CSSProperties & Record<`--${string}`, string | number>;

const spinnerSizeClasses: Record<number, string> = {
  14: "h-3.5 w-3.5 border-2",
  18: "h-[18px] w-[18px] border-2",
  24: "h-6 w-6 border-[2.4px]",
  28: "h-7 w-7 border-[2.8px]",
};

const spinnerColorClasses: Record<string, string> = {
  "var(--accent)": "[border-top-color:var(--accent)]",
  "#64748b": "[border-top-color:#64748b]",
};

function getSpinnerSizeClass(size: number): string {
  return (
    spinnerSizeClasses[size] ??
    "h-[var(--spinner-size)] w-[var(--spinner-size)] [border-width:var(--spinner-border-width)]"
  );
}

function getSpinnerColorClass(color: string): string {
  return (
    spinnerColorClasses[color] ?? "[border-top-color:var(--spinner-color)]"
  );
}

function getSpinnerVars(size: number, color: string): CssVars | undefined {
  const vars: CssVars = {};
  if (!spinnerSizeClasses[size]) {
    vars["--spinner-size"] = `${size}px`;
    vars["--spinner-border-width"] = `${Math.max(2, size / 10)}px`;
  }
  if (!spinnerColorClasses[color]) {
    vars["--spinner-color"] = color;
  }
  return Object.keys(vars).length > 0 ? vars : undefined;
}

/**
 * Standard loading spinner. Replaces all "Loading..." text strings
 * with a clean CSS-only spinning wheel animation.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 24,
  color = "var(--accent)",
  className,
}) => (
  <span
    className={cx(
      "inline-block rounded-full border-solid border-white/10 animate-[ps-spin_0.6s_linear_infinite]",
      getSpinnerSizeClass(size),
      getSpinnerColorClass(color),
      className,
    )}
    role="status"
    aria-label="Loading"
    style={getSpinnerVars(size, color)}
  />
);

/**
 * Full-width centered spinner with optional message (screen-reader only).
 * Use as a drop-in replacement for <div>Loading...</div> blocks.
 */
export const LoadingState: React.FC<{
  size?: number;
  color?: string;
  label?: string;
}> = ({ size = 28, color = "var(--accent)", label }) => (
  <div className="flex items-center justify-center gap-3 py-10">
    <Spinner size={size} color={color} />
    {label && <span className="sr-only">{label}</span>}
  </div>
);

export default Spinner;
