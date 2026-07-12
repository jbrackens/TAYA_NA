"use client";

/**
 * useMoversHistories — pooled 1-day price-history fetches for the Top
 * Movers rail (2026-07-12 integrity fix: mover percentages and
 * sparklines previously came from a hash of the ticker string; now
 * they come from the same /prices series the market page charts use).
 *
 * Fetches run through a small concurrency pool (4-wide, matching the
 * discover page's sparkline pattern) so a 6-row rail never bursts the
 * gateway. Tickers whose series are missing or unusable simply don't
 * appear in the map — callers render those rows without movement
 * claims instead of inventing them.
 */

import { useEffect, useState } from "react";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import { logger } from "../../../lib/logger";

const api = createPredictionClient();
const POOL_WIDTH = 4;
// Module-level 60s TTL cache: /predict remounts (navigation, carousel data
// refresh) reuse recent series instead of refetching six histories per
// view — a 1d series doesn't change meaningfully inside a minute, and the
// public-read rate limiter budget is shared with everything else.
const CACHE_TTL_MS = 60_000;
const seriesCache = new Map<string, { values: number[] | null; ts: number }>();

function cachedSeries(ticker: string): {
  hit: boolean;
  values: number[] | null;
} {
  const entry = seriesCache.get(ticker);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return { hit: true, values: entry.values };
  }
  return { hit: false, values: null };
}

export interface MoversHistories {
  /** ticker → YES-price series (1d range), only entries with ≥2 samples. */
  histories: ReadonlyMap<string, number[]>;
  loading: boolean;
}

export function useMoversHistories(tickers: string[]): MoversHistories {
  const [state, setState] = useState<MoversHistories>({
    histories: new Map(),
    loading: tickers.length > 0,
  });
  // Effect key: the rail's identity, not the array reference.
  const key = tickers.join("|");

  useEffect(() => {
    const list = key ? key.split("|") : [];
    if (list.length === 0) {
      setState({ histories: new Map(), loading: false });
      return;
    }
    let cancelled = false;
    setState({ histories: new Map(), loading: true });
    const results = new Map<string, number[]>();
    let next = 0;

    async function worker(): Promise<void> {
      while (next < list.length && !cancelled) {
        const ticker = list[next];
        next += 1;
        const cached = cachedSeries(ticker);
        if (cached.hit) {
          if (cached.values && cached.values.length >= 2) {
            results.set(ticker, cached.values);
          }
          continue;
        }
        try {
          const h = await api.getMarketPriceHistory(ticker, "1d");
          const values = h.points.map((p) => p.yesPricePoints);
          seriesCache.set(ticker, { values, ts: Date.now() });
          if (values.length >= 2) {
            results.set(ticker, values);
          }
        } catch (err: unknown) {
          // Negative-cache failures too: a hammered or failing endpoint
          // shouldn't be re-hit on every remount within the TTL.
          seriesCache.set(ticker, { values: null, ts: Date.now() });
          logger.warn("TopMovers", "price history fetch failed", err);
        }
      }
    }

    void Promise.all(
      Array.from({ length: Math.min(POOL_WIDTH, list.length) }, () => worker()),
    ).then(() => {
      if (!cancelled) {
        setState({ histories: results, loading: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return state;
}
