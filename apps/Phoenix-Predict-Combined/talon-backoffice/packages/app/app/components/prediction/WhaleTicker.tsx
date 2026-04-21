"use client";

import { useEffect, useState } from "react";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import {
  dedupeMarkets,
  formatCompactUsd,
  formatTimeLeft,
} from "./market-display";

const api = createPredictionClient();

export function WhaleTicker() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);

  useEffect(() => {
    let cancelled = false;

    api
      .getDiscovery()
      .then((discovery) => {
        if (cancelled) return;

        setMarkets(
          dedupeMarkets([
            ...discovery.featured,
            ...discovery.trending,
            ...discovery.closingSoon,
            ...discovery.recent,
          ]).slice(0, 8),
        );
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("WhaleTicker discovery load failed:", message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes predict-ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .predict-ticker {
          background: var(--s3);
          border-bottom: 1px solid var(--b1);
          overflow: hidden;
        }
        .predict-ticker-inner {
          display: flex;
          gap: 24px;
          padding: 8px 0;
          font-size: 12px;
          white-space: nowrap;
          animation: predict-ticker-scroll 60s linear infinite;
          width: max-content;
        }
        .predict-ticker:hover .predict-ticker-inner {
          animation-play-state: paused;
        }
        .predict-ticker-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--t2);
        }
        .predict-ticker-empty {
          padding: 8px 16px;
          color: var(--t3);
          font-size: 12px;
        }
        .predict-ticker-item strong {
          color: var(--accent);
          font-family: 'IBM Plex Mono', ui-monospace, monospace;
          font-variant-numeric: tabular-nums;
          font-weight: 700;
        }
        .predict-ticker-sep { color: var(--t4); }
      `}</style>
      <div className="predict-ticker" aria-label="Live market feed">
        {markets.length === 0 ? (
          <div className="predict-ticker-empty">Live markets updating…</div>
        ) : (
          <div className="predict-ticker-inner">
            {[...markets, ...markets].map((market, index) => (
              <span key={`${market.id}-${index}`}>
                <span className="predict-ticker-item">
                  <span className="live-dot" />
                  <span
                    style={{
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: "var(--t3)",
                      fontSize: 11,
                    }}
                  >
                    LIVE
                  </span>
                  <strong>{market.yesPriceCents}¢ YES</strong>
                  <span>{market.title}</span>
                  <span>{formatCompactUsd(market.volumeCents)} vol</span>
                  <span>{formatTimeLeft(market.closeAt)}</span>
                </span>
                {index < markets.length * 2 - 1 && (
                  <span
                    className="predict-ticker-sep"
                    style={{ margin: "0 12px" }}
                  >
                    ·
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
