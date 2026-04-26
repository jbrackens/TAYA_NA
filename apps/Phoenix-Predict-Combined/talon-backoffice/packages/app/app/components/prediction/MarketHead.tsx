"use client";

/**
 * MarketHead — glass card at the top of /market/[ticker].
 *
 * Contents (DESIGN.md §6 layout mapping):
 *   Row 1: LIVE pill + category pill + volume pill + traders pill +
 *          ticker pill · [right-aligned countdown]
 *   Row 2: Market question (28px bold)
 *   Row 3: Resolution blurb (14px, --t2)
 *
 * Live countdown to closeAt — updates every 30s for a fresh but cheap
 * "closes in …" string.
 */

import { useEffect, useMemo, useState } from "react";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";

interface MarketHeadProps {
  market: PredictionMarket;
  categoryName?: string;
  tradersCount?: number;
}

function formatCountdown(deltaMs: number): string {
  if (deltaMs <= 0) return "Closed";
  const totalSec = Math.floor(deltaMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (days > 0)
    return `Closes in ${days}d ${hours.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m`;
  if (hours > 0)
    return `Closes in ${hours}h ${mins.toString().padStart(2, "0")}m`;
  return `Closes in ${mins}m`;
}

function formatVolume(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}K vol`;
  return `$${dollars.toFixed(0)} vol`;
}

function formatCloseDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getUTCDate();
  const hours = d.getUTCHours().toString().padStart(2, "0");
  const mins = d.getUTCMinutes().toString().padStart(2, "0");
  return `${month} ${day}, ${hours}:${mins} UTC`;
}

export default function MarketHead({
  market,
  categoryName,
  tradersCount,
}: MarketHeadProps) {
  const closeAtMs = useMemo(
    () => new Date(market.closeAt).getTime(),
    [market.closeAt],
  );
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const countdown = formatCountdown(closeAtMs - now);
  const isLive = market.status === "open";

  return (
    <>
      <style>{`
        .mh {
          background: var(--surface-1);
          border: 1px solid var(--border-1);
          padding: 24px 28px;
          margin-bottom: 20px;
          border-radius: var(--r-rh-lg);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .mh-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .mh-pills {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .mh-live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--accent);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
        }
        .mh-live-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 0 4px rgba(43, 228, 128, 0.18);
          animation: mh-pulse 2s ease-in-out infinite;
        }
        @keyframes mh-pulse { 50% { opacity: 0.55; } }
        .mh-pill {
          color: var(--t3);
          font-size: 11px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: var(--r-pill);
          background: rgba(255, 255, 255, 0.04);
          font-variant-numeric: tabular-nums;
          font-family: 'IBM Plex Mono', monospace;
        }
        .mh-pill.cat {
          color: var(--accent);
          background: var(--accent-soft);
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          letter-spacing: 0.04em;
        }
        .mh-countdown {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--t3);
          font-variant-numeric: tabular-nums;
        }
        .mh-countdown .sep { margin: 0 8px; color: var(--t4); }
        .mh-q {
          font-size: 28px;
          font-weight: 600;
          line-height: 1.22;
          letter-spacing: -0.02em;
          color: var(--t1);
          margin-bottom: 8px;
        }
        .mh-desc {
          color: var(--t2);
          font-size: 14px;
          line-height: 1.5;
          max-width: 680px;
          margin: 8px 0 0;
        }
        @media (max-width: 720px) {
          .mh { padding: 20px; }
          .mh-q { font-size: 22px; }
        }
      `}</style>
      <section className="mh">
        <div className="mh-top">
          <div className="mh-pills">
            {isLive && (
              <span className="mh-live">
                <span className="mh-live-dot" aria-hidden="true" />
                LIVE
              </span>
            )}
            {categoryName && (
              <span className="mh-pill cat">{categoryName}</span>
            )}
            <span className="mh-pill">{formatVolume(market.volumeCents)}</span>
            {typeof tradersCount === "number" && (
              <span className="mh-pill">{tradersCount} traders</span>
            )}
            <span className="mh-pill">{market.ticker}</span>
          </div>
          <span className="mh-countdown">
            {countdown}
            <span className="sep">·</span>
            {formatCloseDate(market.closeAt)}
          </span>
        </div>
        <h1 className="mh-q">{market.title}</h1>
        {market.description && <p className="mh-desc">{market.description}</p>}
      </section>
    </>
  );
}
