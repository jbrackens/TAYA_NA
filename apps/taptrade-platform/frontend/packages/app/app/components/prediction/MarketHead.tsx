"use client";

/**
 * MarketHead — the identity block at the top of /market/[ticker]
 * (P9.2, 2026-07-07 — Robinhood-structure pass).
 *
 *   Row 1: eyebrow — LIVE dot · CATEGORY · closes-in · close date
 *   Row 2: market question (28px)
 *   Row 3: sides strip — [● Yes · prob%]   8¢ — 92¢   [prob% · No ●]
 *
 * The old pill rows (volume / trader count / ticker) are gone: volume
 * belongs to the discovery surfaces, machine tickers are plumbing, and
 * the countdown carries the only time-critical fact. Settled markets
 * swap the eyebrow for the outcome and keep the sides strip as a
 * historical record.
 *
 * Live countdown to closeAt — updates every 30s for a fresh but cheap
 * "closes in …" string.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";
import { categoryLabel, localizedMarket } from "./market-content";
import { isOpenMarketStatus, marketStatusLabel } from "./market-display";

interface MarketHeadProps {
  market: PredictionMarket;
  categoryName?: string;
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

function formatCloseDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getUTCDate();
  const hours = d.getUTCHours().toString().padStart(2, "0");
  const mins = d.getUTCMinutes().toString().padStart(2, "0");
  return `${month} ${day}, ${hours}:${mins} UTC`;
}

const MARKET_HEAD_CLASS =
  "font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif]";
const MARKET_HEAD_EYEBROW_CLASS =
  "mb-3 flex flex-wrap items-center gap-2.5 text-xs font-medium text-[var(--t3)]";
const MARKET_HEAD_LIVE_CLASS =
  "inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.08em] text-[var(--yes-text)]";
const MARKET_HEAD_LIVE_DOT_CLASS =
  "h-[7px] w-[7px] animate-pulse rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_rgba(43,228,128,0.18)] motion-reduce:animate-none";
const MARKET_HEAD_SETTLED_CLASS =
  "inline-flex items-center gap-1.5 font-['IBM_Plex_Mono',_monospace] text-[11px] font-bold tracking-[0.1em] text-[var(--t2)]";
const MARKET_HEAD_COUNTDOWN_CLASS =
  "font-['IBM_Plex_Mono',_monospace] text-[11px] text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const MARKET_HEAD_TITLE_CLASS =
  "m-0 mb-5 text-[28px] font-semibold leading-[1.22] tracking-[-0.02em] text-[var(--t1)] max-[720px]:text-[22px]";
const MARKET_HEAD_SIDES_CLASS =
  "grid grid-cols-[1fr_auto_1fr] items-center gap-4";
const MARKET_HEAD_SIDE_CLASS = "flex items-center gap-2.5 min-w-0";
const MARKET_HEAD_SIDE_DOT_CLASS = "h-2.5 w-2.5 shrink-0 rounded-full";
const MARKET_HEAD_SIDE_NAME_CLASS =
  "text-sm font-semibold text-[var(--t1)] leading-tight";
const MARKET_HEAD_SIDE_SUB_CLASS =
  "whitespace-nowrap font-['IBM_Plex_Mono',_monospace] text-[11px] text-[var(--t3)] leading-tight [font-variant-numeric:tabular-nums]";
const MARKET_HEAD_PRICES_CLASS =
  "font-['Inter_Tight',_'Inter',_sans-serif] text-[40px] font-semibold leading-none tracking-[-0.03em] text-[var(--t1)] [font-variant-numeric:tabular-nums] max-[720px]:text-[30px]";

export default function MarketHead({ market, categoryName }: MarketHeadProps) {
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
  const isLive = isOpenMarketStatus(displayMarket.status);
  const isSettled = displayMarket.status === "settled";
  const lifecycleLabel = marketStatusLabel(displayMarket.status, t);
  const settledLabel = isSettled
    ? displayMarket.result === "yes"
      ? t("SETTLED_YES_WINS")
      : displayMarket.result === "no"
        ? t("SETTLED_NO_WINS")
        : t("SETTLED")
    : null;

  const yes = displayMarket.yesPricePointsCents;
  const no = displayMarket.noPricePointsCents;

  return (
    <section className={MARKET_HEAD_CLASS}>
      <div className={MARKET_HEAD_EYEBROW_CLASS}>
        {isLive && (
          <span className={MARKET_HEAD_LIVE_CLASS}>
            <span className={MARKET_HEAD_LIVE_DOT_CLASS} aria-hidden="true" />
            {t("LIVE")}
          </span>
        )}
        {isSettled && settledLabel && (
          <span className={MARKET_HEAD_SETTLED_CLASS}>
            {t("SETTLED")} · {settledLabel}
          </span>
        )}
        {displayCategory && (
          <>
            <span aria-hidden="true">·</span>
            <span className="uppercase tracking-[0.06em]">
              {displayCategory}
            </span>
          </>
        )}
        <span aria-hidden="true">·</span>
        <span className={MARKET_HEAD_COUNTDOWN_CLASS}>
          {isLive ? (
            <>
              {countdown}
              <span className="mx-1.5 text-[var(--t4)]">·</span>
              {formatCloseDate(displayMarket.closeAt)}
            </>
          ) : (
            lifecycleLabel
          )}
        </span>
      </div>

      <h1 className={MARKET_HEAD_TITLE_CLASS}>{displayMarket.title}</h1>

      <div className={MARKET_HEAD_SIDES_CLASS}>
        <div className={MARKET_HEAD_SIDE_CLASS}>
          <span
            className={`${MARKET_HEAD_SIDE_DOT_CLASS} bg-[var(--yes)]`}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className={`${MARKET_HEAD_SIDE_NAME_CLASS} block`}>
              {t("YES")}
            </span>
            <span className={`${MARKET_HEAD_SIDE_SUB_CLASS} block`}>
              {yes}% {t("PROB")}
            </span>
          </span>
        </div>
        <div
          className={MARKET_HEAD_PRICES_CLASS}
          aria-label={t("YES_NO_PRICES", {
            yes,
            no,
            defaultValue: `Yes ${yes} cents, No ${no} cents`,
          })}
        >
          {yes}¢<span className="mx-2.5 text-[var(--t4)]">—</span>
          {no}¢
        </div>
        <div className={`${MARKET_HEAD_SIDE_CLASS} justify-end text-right`}>
          <span className="min-w-0">
            <span className={`${MARKET_HEAD_SIDE_NAME_CLASS} block`}>
              {t("NO")}
            </span>
            <span className={`${MARKET_HEAD_SIDE_SUB_CLASS} block`}>
              {no}% {t("PROB")}
            </span>
          </span>
          <span
            className={`${MARKET_HEAD_SIDE_DOT_CLASS} bg-[var(--no)]`}
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
