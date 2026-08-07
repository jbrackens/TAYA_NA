"use client";

/**
 * useLiveMarketUpdates — subscribe the discovery surface to market:{id}
 * WebSocket events for the visible markets, so /predict stops being a
 * still life. Mirrors the market detail page's contract: auth-gated,
 * per-market ts watermark, normalized point fields (shared live.ts).
 *
 * The channel list is bounded by the caller (visible markets only) and
 * the hub reference-counts subscriptions, so churn on selection is cheap.
 */

import { useEffect, useRef } from "react";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";
import { subscribePredictWs } from "../../../lib/websocket/predict-ws";
import { applyMarketEvent } from "../live";

export function useLiveMarketUpdates(
  marketIds: string[],
  enabled: boolean,
  onUpdate: (marketId: string, fields: Partial<PredictionMarket>) => void,
): void {
  // Latest callback without resubscribing on every render.
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  // Stable dependency: identity of the id SET, order-insensitive. The
  // effect derives the ids back from the key so the churning array
  // identity never enters the dependency list.
  const idsKey = [...new Set(marketIds)].sort().join("|");
  useEffect(() => {
    if (!enabled || idsKey === "") return;
    const ids = idsKey.split("|");
    const watermarks = new Map<string, string>();
    const unsubscribes = ids.map((marketId) =>
      subscribePredictWs(`market:${marketId}`, (_eventId, data) => {
        const applied = applyMarketEvent(data, watermarks.get(marketId) ?? "");
        if (!applied) return;
        watermarks.set(marketId, applied.ts);
        onUpdateRef.current(marketId, applied.fields);
      }),
    );
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [idsKey, enabled]);
}
