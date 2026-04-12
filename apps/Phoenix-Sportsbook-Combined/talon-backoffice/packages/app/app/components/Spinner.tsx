"use client";

import React from "react";

interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Standard loading spinner. Replaces all "Loading..." text strings
 * with a clean CSS-only spinning wheel animation.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 24,
  color = "#39ff14",
  className,
}) => (
  <span
    className={className}
    role="status"
    aria-label="Loading"
    style={{
      display: "inline-block",
      width: size,
      height: size,
      border: `${Math.max(2, size / 10)}px solid rgba(255,255,255,0.1)`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "ps-spin 0.6s linear infinite",
    }}
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
}> = ({ size = 28, color = "#39ff14", label }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 0",
      gap: 12,
    }}
  >
    <Spinner size={size} color={color} />
    {label && (
      <span className="sr-only">{label}</span>
    )}
  </div>
);

export default Spinner;
