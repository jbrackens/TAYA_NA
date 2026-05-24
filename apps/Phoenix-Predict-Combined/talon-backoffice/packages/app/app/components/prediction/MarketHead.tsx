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
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import { categoryLabel, localizedMarket } from "./market-content";

interface MarketHeadProps {
  market: PredictionMarket;
  categoryName?: string;
  tradersCount?: number;
}

function formatCountdown(
  deltaMs: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (deltaMs <= 0) return t("CLOSED");
  const totalSec = Math.floor(deltaMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (days > 0)
    return t("CLOSES_IN_DHM", {
      days,
      hours: hours.toString().padStart(2, "0"),
      minutes: mins.toString().padStart(2, "0"),
    });
  if (hours > 0)
    return t("CLOSES_IN_HM", {
      hours,
      minutes: mins.toString().padStart(2, "0"),
    });
  return t("CLOSES_IN_M", { minutes: mins });
}

function formatVolume(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
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
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const displayMarket = localizedMarket(contentT, market);
  const displayCategory = categoryName
    ? categoryLabel(contentT, categoryName)
    : "";
  const closeAtMs = useMemo(
    () => new Date(displayMarket.closeAt).getTime(),
    [displayMarket.closeAt],
  );
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const countdown = formatCountdown(closeAtMs - now, t);
  const isLive = displayMarket.status === "open";
  const isSettled = displayMarket.status === "settled";
  // Settled markets surface the resolved outcome instead of a live countdown.
  // Without this, the hero kept saying "Closes in 172d" for a market that
  // resolved weeks ago, contradicting the "Trading is paused" banner in the
  // ticket and confusing investors during walkthroughs.
  const settledLabel = isSettled
    ? displayMarket.result === "yes"
      ? t("SETTLED_YES_WINS")
      : displayMarket.result === "no"
        ? t("SETTLED_NO_WINS")
        : t("SETTLED")
    : null;

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
        .mh-settled {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--t2);
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid var(--border-1);
          padding: 4px 10px;
          border-radius: var(--r-pill);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
        }
        .mh-settled-outcome {
          color: var(--t1);
          letter-spacing: 0.04em;
        }
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
                {t("LIVE")}
              </span>
            )}
            {isSettled && settledLabel && (
              <span className="mh-settled">
                {t("SETTLED")}
                <span className="mh-settled-outcome">· {settledLabel}</span>
              </span>
            )}
            {displayCategory && (
              <span className="mh-pill cat">{displayCategory}</span>
            )}
            <span className="mh-pill">
              {t("VOLUME_VALUE", {
                value: formatVolume(displayMarket.volumeCents),
              })}
            </span>
            {typeof tradersCount === "number" && (
              <span className="mh-pill">
                {t("TRADER_COUNT", { count: tradersCount })}
              </span>
            )}
            <span className="mh-pill">{displayMarket.ticker}</span>
          </div>
          <span className="mh-countdown">
            {isSettled ? t("CLOSED") : countdown}
            <span className="sep">·</span>
            {formatCloseDate(displayMarket.closeAt)}
          </span>
        </div>
        <h1 className="mh-q">{displayMarket.title}</h1>
        {displayMarket.description && (
          <p className="mh-desc">{displayMarket.description}</p>
        )}
      </section>
    </>
  );
}
