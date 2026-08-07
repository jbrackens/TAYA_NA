"use client";

/**
 * usePriceTick — directional wash trigger for a live price cell.
 * Returns "up" | "down" for ~900ms after the observed value changes,
 * then null. First render never ticks (there is no previous truth to
 * compare against — a mount is not a movement). Reduced-motion users
 * still get the value change; the CSS layer drops only the wash.
 */

import { useEffect, useRef, useState } from "react";
import { tickDirection } from "../live";

const TICK_VISIBLE_MS = 900;

export function usePriceTick(value: number): "up" | "down" | null {
  const previousRef = useRef(value);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = value;
    const next = tickDirection(previous, value);
    if (!next) return;
    setDirection(next);
    const timer = window.setTimeout(
      () => setDirection(null),
      TICK_VISIBLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [value]);
  return direction;
}
