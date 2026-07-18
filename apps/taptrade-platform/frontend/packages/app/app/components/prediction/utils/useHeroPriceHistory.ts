"use client";

/**
 * useHeroPriceHistory — fetches the backend price-history series for a
 * single market and returns its point-native YES price sequence (ready
 * to feed heroChartPath) plus the REAL movement over the range for the
 * hero's delta pill (2026-07-12 integrity fix: the pill previously
 * showed a hash-of-ticker invention).
 *
 * `movement` is computed from the UNTRIMMED series (range open → last)
 * so the pill describes the full fetched range even when the chart
 * trims leading flat buckets for shape. It is null while loading, on
 * failure, or when the series is flat — callers hide the pill rather
 * than invent a number. `loading` distinguishes "still fetching" from
 * "no data" so the UI can show a quiet placeholder instead of nothing.
 *
 * The hero chart only ever shows the 1-day range. If we ever want
 * range tabs on /predict/, lift `range` to a prop.
 */

import { useEffect, useState } from "react";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import { logger } from "../../../lib/logger";
import { movementFromSeries, type SeriesMovement } from "./spark";

const api = createPredictionClient();

export interface HeroPriceHistory {
  /** Trimmed series for the chart, or null (loading / no usable data). */
  points: number[] | null;
  /** Real range movement for the delta pill, or null (no honest claim). */
  movement: SeriesMovement | null;
  loading: boolean;
}

function hasMovement(points: number[]): boolean {
  if (points.length < 2) return false;
  return points.some((p) => p !== points[0]);
}

export function useHeroPriceHistory(ticker: string): HeroPriceHistory {
  const [state, setState] = useState<HeroPriceHistory>({
    points: null,
    movement: null,
    loading: true,
  });

  useEffect(() => {
    // Empty ticker = "no market yet" (DiscoveryHero calls this hook
    // unconditionally to keep React's hook order stable while the
    // market loads). Nothing to fetch; report a settled empty state.
    if (!ticker) {
      setState({ points: null, movement: null, loading: false });
      return;
    }
    let cancelled = false;
    setState({ points: null, movement: null, loading: true });
    api
      .getMarketPriceHistory(ticker, "1d")
      .then((h) => {
        if (cancelled) return;
        const all = h.points.map((p) => p.yesPricePoints);
        const movement = movementFromSeries(all);
        if (!hasMovement(all)) {
          setState({ points: null, movement, loading: false });
          return;
        }
        // Trim the leading run of identical carry-forward buckets so
        // the chart starts at the first real movement instead of a
        // long flat tail at the fallback price. Always keep at least
        // 8 points so the line has visible shape.
        let points = all;
        if (all.length > 8) {
          let leadingFlat = 0;
          for (let i = 1; i < all.length && all[i] === all[0]; i++) {
            leadingFlat++;
          }
          const trimmed = all.slice(Math.max(0, leadingFlat - 1));
          points = trimmed.length >= 8 ? trimmed : all;
        }
        setState({ points, movement, loading: false });
      })
      .catch((err: unknown) => {
        logger.warn("Hero", "price history fetch failed", err);
        if (!cancelled) {
          setState({ points: null, movement: null, loading: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return state;
}
