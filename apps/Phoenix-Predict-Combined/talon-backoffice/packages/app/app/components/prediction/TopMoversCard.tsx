"use client";

import Link from "next/link";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import {
  dedupeMarkets,
  formatCompactUsd,
  formatTimeLeft,
} from "./market-display";

interface TopMoversCardProps {
  markets: PredictionMarket[];
}

export function TopMoversCard({ markets }: TopMoversCardProps) {
  const rows = dedupeMarkets(markets).slice(0, 4);

  return (
    <>
      <style>{`
        .tmc {
          background: var(--s1);
          border: 1px solid var(--b1);
          border-radius: var(--r-md);
          padding: 16px;
        }
        .tmc-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .tmc-head-icon {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: var(--accent-soft);
          color: var(--accent);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
        }
        .tmc-head-title { font-weight: 700; font-size: 14px; color: var(--t1); }
        .tmc-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          font-size: 13px;
          border-top: 1px dashed var(--b1);
          text-decoration: none;
          color: inherit;
        }
        .tmc-row:first-of-type { border-top: 0; }
        .tmc-row:hover .tmc-q { color: var(--t1); }
        .tmc-q {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--t2);
        }
        .tmc-meta {
          display: block;
          font-size: 11px;
          color: var(--t3);
          margin-top: 4px;
        }
        .tmc-pct {
          font-family: 'IBM Plex Mono', monospace;
          font-variant-numeric: tabular-nums;
          font-weight: 700;
          color: var(--accent);
          min-width: 70px;
          text-align: right;
        }
        .tmc-empty {
          color: var(--t3);
          font-size: 12px;
          padding: 8px 0;
        }
      `}</style>
      <div className="tmc" aria-label="Trending markets">
        <div className="tmc-head">
          <span className="tmc-head-icon" aria-hidden>
            ↗
          </span>
          <span className="tmc-head-title">Trending now</span>
        </div>
        {rows.length === 0 ? (
          <div className="tmc-empty">No market activity yet.</div>
        ) : (
          rows.map((market) => (
            <Link
              key={market.id}
              href={`/market/${market.ticker}`}
              className="tmc-row"
            >
              <span className="tmc-q">
                {market.title}
                <span className="tmc-meta">
                  {formatCompactUsd(market.openInterestCents)} open interest ·{" "}
                  {formatTimeLeft(market.closeAt)}
                </span>
              </span>
              <span className="tmc-pct">{market.yesPriceCents}¢ YES</span>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
