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

const MARKET_HEAD_CLASS =
  "mb-5 rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-7 py-6 font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif] max-[720px]:p-5";
const MARKET_HEAD_TOP_CLASS =
  "mb-[14px] flex flex-wrap items-center justify-between gap-3";
const MARKET_HEAD_PILLS_CLASS = "flex flex-wrap items-center gap-2";
const MARKET_HEAD_LIVE_CLASS =
  "inline-flex items-center gap-1.5 font-['IBM_Plex_Mono',_monospace] text-[10px] font-bold tracking-[0.16em] text-[var(--accent)]";
const MARKET_HEAD_LIVE_DOT_CLASS =
  "h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_rgba(43,228,128,0.18)] motion-reduce:animate-none";
const MARKET_HEAD_SETTLED_CLASS =
  "inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border border-[var(--border-1)] bg-black/[0.05] px-2.5 py-1 font-['IBM_Plex_Mono',_monospace] text-[10px] font-bold tracking-[0.16em] text-[var(--t2)]";
const MARKET_HEAD_SETTLED_OUTCOME_CLASS =
  "tracking-[0.04em] text-[var(--t1)]";
const MARKET_HEAD_PILL_CLASS =
  "rounded-[var(--r-pill)] bg-white/[0.04] px-2.5 py-1 font-['IBM_Plex_Mono',_monospace] text-[11px] font-medium text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const MARKET_HEAD_CATEGORY_PILL_CLASS =
  "rounded-[var(--r-pill)] bg-[var(--accent-soft)] px-2.5 py-1 font-['Inter',_sans-serif] text-[11px] font-semibold tracking-[0.04em] text-[var(--accent)] [font-variant-numeric:tabular-nums]";
const MARKET_HEAD_COUNTDOWN_CLASS =
  "font-['IBM_Plex_Mono',_monospace] text-xs text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const MARKET_HEAD_TITLE_CLASS =
  "mb-2 text-[28px] font-semibold leading-[1.22] tracking-[-0.02em] text-[var(--t1)] max-[720px]:text-[22px]";
const MARKET_HEAD_DESC_CLASS =
  "mt-2 mb-0 max-w-[680px] text-sm leading-[1.5] text-[var(--t2)]";

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
    <section className={MARKET_HEAD_CLASS}>
      <div className={MARKET_HEAD_TOP_CLASS}>
        <div className={MARKET_HEAD_PILLS_CLASS}>
          {isLive && (
            <span className={MARKET_HEAD_LIVE_CLASS}>
              <span className={MARKET_HEAD_LIVE_DOT_CLASS} aria-hidden="true" />
              {t("LIVE")}
            </span>
          )}
          {isSettled && settledLabel && (
            <span className={MARKET_HEAD_SETTLED_CLASS}>
              {t("SETTLED")}
              <span className={MARKET_HEAD_SETTLED_OUTCOME_CLASS}>
                · {settledLabel}
              </span>
            </span>
          )}
          {displayCategory && (
            <span className={MARKET_HEAD_CATEGORY_PILL_CLASS}>
              {displayCategory}
            </span>
          )}
          <span className={MARKET_HEAD_PILL_CLASS}>
            {t("VOLUME_VALUE", {
              value: formatVolume(displayMarket.volumeCents),
            })}
          </span>
          {typeof tradersCount === "number" && (
            <span className={MARKET_HEAD_PILL_CLASS}>
              {t("TRADER_COUNT", { count: tradersCount })}
            </span>
          )}
          <span className={MARKET_HEAD_PILL_CLASS}>{displayMarket.ticker}</span>
        </div>
        <span className={MARKET_HEAD_COUNTDOWN_CLASS}>
          {isSettled ? t("CLOSED") : countdown}
          <span className="mx-2 text-[var(--t4)]">·</span>
          {formatCloseDate(displayMarket.closeAt)}
        </span>
      </div>
      <h1 className={MARKET_HEAD_TITLE_CLASS}>{displayMarket.title}</h1>
      {displayMarket.description && (
        <p className={MARKET_HEAD_DESC_CLASS}>{displayMarket.description}</p>
      )}
    </section>
  );
}
