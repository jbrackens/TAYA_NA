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
          padding: 22px 26px 20px;
          margin-bottom: 24px;
          border-radius: var(--r-md);
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
          background: rgba(255, 80, 80, 0.15);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 120, 120, 0.25);
          color: #ffbdbd;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          padding: 5px 10px 5px 8px;
          border-radius: var(--r-pill);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 2px 8px rgba(255, 60, 60, 0.12);
        }
        .mh-live-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #ff9a9a 0%, #ff4444 100%);
          box-shadow: 0 0 8px rgba(255, 80, 80, 0.9);
          animation: mh-pulse 1.6s ease-in-out infinite;
        }
        @keyframes mh-pulse { 50% { opacity: 0.4; transform: scale(0.92); } }
        .mh-pill {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--t2);
          font-size: 11px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: var(--r-pill);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
          font-variant-numeric: tabular-nums;
          font-family: 'IBM Plex Mono', monospace;
        }
        .mh-pill.cat {
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          background: rgba(43, 228, 128, 0.08);
          border: 1px solid rgba(43, 228, 128, 0.22);
          box-shadow:
            inset 0 1px 0 rgba(43, 228, 128, 0.22),
            0 0 16px rgba(43, 228, 128, 0.08);
        }
        .mh-countdown {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          color: var(--t2);
          font-variant-numeric: tabular-nums;
        }
        .mh-countdown .sep { margin: 0 8px; color: var(--t4); }
        .mh-q {
          font-size: 28px;
          font-weight: 700;
          line-height: 1.22;
          letter-spacing: -0.01em;
          margin-bottom: 8px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .mh-desc {
          color: var(--t2);
          font-size: 14px;
          line-height: 1.5;
          max-width: 680px;
        }
        @media (max-width: 720px) {
          .mh { padding: 18px 20px 16px; }
          .mh-q { font-size: 22px; }
        }
      `}</style>
      <section className="glass mh">
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
