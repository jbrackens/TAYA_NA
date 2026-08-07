/**
 * Live-ness — pure helpers for real-time market updates (no React).
 *
 * Motion doctrine (1C): motion is DATA-DRIVEN or FEEDBACK — never
 * decorative. Nothing here invents movement: every tick traces back to a
 * `market:{id}` WebSocket event the gateway actually emitted. Idle
 * surfaces hold still; the pulse is real.
 */

import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";

/** Wire shape of a market:{id} event — points fields plus a ts watermark. */
export type MarketUpdatePayload = Partial<PredictionMarket> & {
  ts?: string;
  yesPricePoints?: number;
  noPricePoints?: number;
  lastTradePricePoints?: number;
  volumePoints?: number;
  openInterestPoints?: number;
};

/**
 * Keep only well-typed point fields from a market event (the wire can
 * carry partial/legacy shapes) and default the unit. Shared by the
 * market detail page and the workspace feed.
 */
export function normalizeMarketUpdateFields(
  payload: MarketUpdatePayload,
): Partial<PredictionMarket> {
  const {
    ts: _ts,
    yesPricePoints,
    noPricePoints,
    lastTradePricePoints,
    volumePoints,
    openInterestPoints,
    ...rest
  } = payload;
  return {
    ...rest,
    ...(typeof yesPricePoints === "number" ? { yesPricePoints } : {}),
    ...(typeof noPricePoints === "number" ? { noPricePoints } : {}),
    ...(typeof lastTradePricePoints === "number"
      ? { lastTradePricePoints }
      : {}),
    ...(typeof volumePoints === "number" ? { volumePoints } : {}),
    ...(typeof openInterestPoints === "number" ? { openInterestPoints } : {}),
    unit: payload.unit || "PTS",
  };
}

/**
 * Watermark-gated event application. RFC3339 timestamps compare
 * lexicographically in time order, so string comparison suffices.
 * Returns the normalized fields plus the advanced watermark, or null
 * when the event is stale/malformed and must be dropped.
 */
export function applyMarketEvent(
  payload: unknown,
  lastTs: string,
): { fields: Partial<PredictionMarket>; ts: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const update = payload as MarketUpdatePayload;
  if (update.ts && update.ts <= lastTs) return null;
  return {
    fields: normalizeMarketUpdateFields(update),
    ts: update.ts ?? lastTs,
  };
}

/** Direction of a price change, for the tick wash. */
export function tickDirection(
  previous: number,
  next: number,
): "up" | "down" | null {
  if (!Number.isFinite(previous) || !Number.isFinite(next)) return null;
  if (next === previous) return null;
  return next > previous ? "up" : "down";
}

/**
 * CSS class for a tick direction. The wash speaks in the DIRECTIONAL
 * soft tokens (--yes-soft/--no-soft) — green/red stay the market's
 * voice, per the Five Rules. Null → no class, no motion.
 */
export function tickClass(direction: "up" | "down" | null): string {
  if (direction === "up") return "price-tick-up";
  if (direction === "down") return "price-tick-down";
  return "";
}
