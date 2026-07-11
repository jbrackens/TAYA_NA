"use client";

/**
 * Real price-history hooks for discovery surfaces (P10, 2026-07-12).
 *
 * `useMarketHistory(ticker)` — one market's 1-day YES series with an
 * explicit fetch state, feeding both the hero chart and its delta pill
 * so the number and the line always come from the same data.
 *
 * `useMarketHistories(tickers)` — bounded parallel fetch for the Top
 * Movers rail (N ≤ MAX_BATCH). Returns per-ticker states so rows can
 * render honestly while loading or when a market has no history.
 *
 * A module-level cache (60s TTL) deduplicates fetches across the hero
 * carousel slides and the sidebar, which display overlapping markets.
 *
 * States:
 *   loading — fetch in flight; draw nothing, claim nothing
 *   ready   — ≥2 points with real movement; chart + delta allowed
 *   empty   — fetch OK but no drawable movement; flat line at current
 *             price is honest, delta is not (render "—")
 *   error   — fetch failed; draw nothing, claim nothing
 */

import { useEffect, useMemo, useState } from "react";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import { logger } from "../../../lib/logger";

const api = createPredictionClient();

export type HistoryState = "loading" | "ready" | "empty" | "error";

export interface MarketHistory {
  state: HistoryState;
  /** YES-price series, oldest → newest. Non-null only when state === "ready". */
  points: number[] | null;
}

const LOADING: MarketHistory = { state: "loading", points: null };

function hasMovement(points: number[]): boolean {
  if (points.length < 2) return false;
  return points.some((p) => p !== points[0]);
}

/**
 * Trim the leading run of identical carry-forward buckets so the chart
 * starts at the first real movement instead of a long flat tail at the
 * fallback price. Always keeps at least 8 points for visible shape.
 */
function trimLeadingFlat(all: number[]): number[] {
  if (all.length <= 8) return all;
  let leadingFlat = 0;
  for (let i = 1; i < all.length && all[i] === all[0]; i++) {
    leadingFlat++;
  }
  const trimmed = all.slice(Math.max(0, leadingFlat - 1));
  return trimmed.length >= 8 ? trimmed : all;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<
  string,
  { at: number; promise: Promise<MarketHistory> }
>();

function fetchHistory(ticker: string): Promise<MarketHistory> {
  const hit = cache.get(ticker);
  const now = Date.now();
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.promise;
  const promise: Promise<MarketHistory> = api
    .getMarketPriceHistory(ticker, "1d")
    .then((h): MarketHistory => {
      const all = h.points.map((p) => p.yesPricePoints);
      if (!hasMovement(all)) return { state: "empty", points: null };
      return { state: "ready", points: trimLeadingFlat(all) };
    })
    .catch((err: unknown): MarketHistory => {
      logger.warn("PriceHistory", `fetch failed for ${ticker}`, err);
      cache.delete(ticker); // don't cache failures for the full TTL
      return { state: "error", points: null };
    });
  cache.set(ticker, { at: now, promise });
  return promise;
}

export function useMarketHistory(ticker: string): MarketHistory {
  const [history, setHistory] = useState<MarketHistory>(LOADING);

  useEffect(() => {
    let cancelled = false;
    setHistory(LOADING);
    fetchHistory(ticker).then((h) => {
      if (!cancelled) setHistory(h);
    });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return history;
}

/** Bounded batch size — the movers rail shows ≤8 rows. */
const MAX_BATCH = 8;

export function useMarketHistories(
  tickers: string[],
): Record<string, MarketHistory> {
  const key = useMemo(() => tickers.slice(0, MAX_BATCH).join("|"), [tickers]);
  const [histories, setHistories] = useState<Record<string, MarketHistory>>({});

  useEffect(() => {
    let cancelled = false;
    const bounded = key ? key.split("|") : [];
    if (bounded.length === 0) {
      setHistories({});
      return;
    }
    setHistories(Object.fromEntries(bounded.map((tk) => [tk, LOADING])));
    bounded.forEach((tk) => {
      fetchHistory(tk).then((h) => {
        if (cancelled) return;
        setHistories((prev) => ({ ...prev, [tk]: h }));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return histories;
}
