/**
 * Honest price-movement derivation, shared by /discover and the /predict
 * feed (step 10 — extracted from discover/page.tsx so the two surfaces
 * can't drift). A movement exists ONLY when a real /prices series says
 * so: fewer than two finite points, or a zero first value, is null — the
 * caller renders nothing, never an invented delta.
 */

import type { MarketPriceHistory } from "@taptrade-ui/api-client/src/prediction-types";

export interface MarketMovement {
  deltaPoints: number;
  pct: number;
  direction: "up" | "down" | "flat";
  values: number[];
}

export function movementFromHistory(
  history: MarketPriceHistory,
): MarketMovement | null {
  const values = history.points
    .map((point) => point.yesPricePoints)
    .filter((value) => Number.isFinite(value));
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  if (!first) return null;
  const delta = last - first;
  return {
    deltaPoints: delta,
    pct: Math.abs((delta / first) * 100),
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    values,
  };
}
