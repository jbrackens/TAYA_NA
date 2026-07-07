"use client";

/**
 * useHeroPriceHistory — fetches the backend price-history series for a
 * single market and returns its point-native YES price sequence ready to feed
 * into heroChartPath. Returns null while loading or on failure so the
 * caller can fall back to the deterministic synthetic walk.
 *
 * The hero chart only ever shows the 1-day range. If we ever want
 * range tabs on /predict/, lift `range` to a prop.
 */

import { useEffect, useState } from "react";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import { logger } from "../../../lib/logger";

const api = createPredictionClient();

function hasMovement(points: number[]): boolean {
  if (points.length < 2) return false;
  return points.some((p) => p !== points[0]);
}

export function useHeroPriceHistory(ticker: string): number[] | null {
  const [points, setPoints] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getMarketPriceHistory(ticker, "1d")
      .then((h) => {
        if (cancelled) return;
        // Trim the leading run of identical carry-forward buckets so
        // the chart starts at the first real movement instead of a
        // long flat tail at the fallback price. Always keep at least
        // 8 points so the line has visible shape.
        const all = h.points.map((p) => p.yesPricePoints);
        if (!hasMovement(all)) {
          setPoints(null);
          return;
        }
        if (all.length <= 8) {
          setPoints(all);
          return;
        }
        let leadingFlat = 0;
        for (let i = 1; i < all.length && all[i] === all[0]; i++) {
          leadingFlat++;
        }
        const trimmed = all.slice(Math.max(0, leadingFlat - 1));
        setPoints(trimmed.length >= 8 ? trimmed : all);
      })
      .catch((err: unknown) => {
        logger.warn("Hero", "price history fetch failed", err);
        if (!cancelled) setPoints(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return points;
}
