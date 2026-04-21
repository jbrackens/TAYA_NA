"use client";

import Link from "next/link";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import {
  dedupeMarkets,
  formatCompactUsd,
  formatTimeLeft,
  sortMarketsByVolume,
} from "./market-display";

interface WhaleActivityCardProps {
  markets: PredictionMarket[];
}

export function WhaleActivityCard({ markets }: WhaleActivityCardProps) {
  const rows = sortMarketsByVolume(dedupeMarkets(markets)).slice(0, 4);

  return (
    <>
      <style>{`
        .wac {
          background: linear-gradient(180deg, rgba(251,191,36,0.06), rgba(251,191,36,0.02));
          border: 1px solid rgba(251,191,36,0.22);
          border-radius: var(--r-md);
          padding: 16px;
        }
        .wac-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .wac-head-icon {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: var(--whale-soft);
          color: var(--whale);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
        }
        .wac-head-title { font-weight: 700; font-size: 14px; color: var(--t1); }
        .wac-chip {
          margin-left: auto;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
          background: var(--s2);
          color: var(--t2);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .wac-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 0;
          border-top: 1px dashed var(--b1);
          text-decoration: none;
          color: inherit;
        }
        .wac-row:first-of-type { border-top: 0; }
        .wac-row:hover .wac-market {
          color: var(--t1);
        }
        .wac-main {
          flex: 1;
          min-width: 0;
        }
        .wac-market {
          display: block;
          color: var(--t2);
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .wac-price {
          color: var(--t1);
          font-weight: 700;
          white-space: nowrap;
          font-family: 'IBM Plex Mono', monospace;
          font-variant-numeric: tabular-nums;
          font-size: 12px;
        }
        .wac-detail {
          color: var(--t3);
          display: block;
          font-size: 12px;
          line-height: 1.4;
        }
        .wac-empty {
          color: var(--t3);
          font-size: 12px;
          padding-top: 4px;
        }
      `}</style>
      <div className="wac" aria-label="Most active markets">
        <div className="wac-head">
          <span className="wac-head-icon" aria-hidden>
            ●
          </span>
          <span className="wac-head-title">Most active</span>
          <span className="wac-chip">Live</span>
        </div>
        {rows.length === 0 ? (
          <div className="wac-empty">No live market activity yet.</div>
        ) : (
          rows.map((market) => (
            <Link
              key={market.id}
              href={`/market/${market.ticker}`}
              className="wac-row"
            >
              <div className="wac-main">
                <span className="wac-market">{market.title}</span>
                <span className="wac-detail">
                  {formatCompactUsd(market.volumeCents)} volume ·{" "}
                  {formatTimeLeft(market.closeAt)}
                </span>
              </div>
              <span className="wac-price">{market.yesPriceCents}¢ YES</span>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
