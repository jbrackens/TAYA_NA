"use client";

/**
 * MarketHead — the ARTICLE HEAD of /market/[ticker]
 * (P11 "Standing Question", 2026-07-12).
 *
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← heavy ink rule
 *   LIVE · POLITICS · CLOSES IN 2D   ← rubric/byline row (small caps)
 *   Will the Senate flip in 2026?    ← serif headline
 *   YES 62%        62¢ — 38¢     NO 38%  ← wire figure row (mono)
 *
 * The Robinhood-era pill chrome, pulsing live dot, and colored side
 * dots are retired: the story sits flat on the paper and speaks in
 * rules, serif, and wire mono. Settled markets swap the LIVE tag for
 * the outcome and keep the figure row as a historical record.
 *
 * Live countdown to closeAt — updates every 30s for a fresh but cheap
 * "closes in …" string (logic unchanged from P9.2).
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

// P11: article head — heavy ink rule on top, print furniture below.
const MARKET_HEAD_CLASS =
  "border-t-[3px] border-[var(--rule-ink)] pt-3 font-sans";
// Rubric/byline row — small-caps print furniture (LIVE · category · closes).
const MARKET_HEAD_EYEBROW_CLASS =
  "mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--t3)]";
const MARKET_HEAD_LIVE_CLASS =
  "inline-flex items-center gap-1.5 text-[var(--accent-text)]";
// Static press-blue dot — nothing blinks on the desk.
const MARKET_HEAD_LIVE_DOT_CLASS =
  "h-[6px] w-[6px] rounded-full bg-[var(--brand-dot)]";
const MARKET_HEAD_SETTLED_CLASS =
  "inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[0.1em] text-[var(--t2)]";
const MARKET_HEAD_COUNTDOWN_CLASS =
  "font-mono text-[11px] font-semibold text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const MARKET_HEAD_RULE_SEP_CLASS = "text-[var(--border-2)]";
// The question is the headline — serif, balanced, no tracking tricks.
const MARKET_HEAD_TITLE_CLASS =
  "type-display m-0 mb-5 max-w-[28ch] text-balance text-[clamp(26px,3vw,42px)] font-medium leading-[1.12] text-[var(--t1)]";
// Below 480px the three-cell strip overlapped the price pair
// (P10 QA, 2026-07-12) — side labels wrap under the prices instead.
const MARKET_HEAD_SIDES_CLASS =
  "grid grid-cols-[1fr_auto_1fr] items-center gap-4 max-[480px]:grid-cols-2 max-[480px]:gap-2 max-[480px]:[&>*:nth-child(2)]:order-first max-[480px]:[&>*:nth-child(2)]:col-span-2 max-[480px]:[&>*:nth-child(2)]:justify-self-center";
const MARKET_HEAD_SIDE_CLASS = "flex min-w-0 flex-col gap-0.5";
const MARKET_HEAD_SIDE_NAME_CLASS =
  "text-[11px] font-bold uppercase tracking-[0.14em] leading-tight";
const MARKET_HEAD_SIDE_SUB_CLASS =
  "whitespace-nowrap font-mono text-[11px] text-[var(--t3)] leading-tight [font-variant-numeric:tabular-nums]";
// The wire figure: big mono price pair, tabular, no display-font flourish.
const MARKET_HEAD_PRICES_CLASS =
  "font-mono text-[40px] font-semibold leading-none text-[var(--t1)] [font-variant-numeric:tabular-nums] max-[720px]:text-[30px]";

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

  const yes = displayMarket.yesPricePoints;
  const no = displayMarket.noPricePoints;

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
            <span aria-hidden="true" className={MARKET_HEAD_RULE_SEP_CLASS}>
              |
            </span>
            <span>{displayCategory}</span>
          </>
        )}
        <span aria-hidden="true" className={MARKET_HEAD_RULE_SEP_CLASS}>
          |
        </span>
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
            className={`${MARKET_HEAD_SIDE_NAME_CLASS} text-[var(--yes-text)]`}
          >
            {t("YES")}
          </span>
          <span className={MARKET_HEAD_SIDE_SUB_CLASS}>
            {yes}% {t("PROB")}
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
        <div className={`${MARKET_HEAD_SIDE_CLASS} items-end text-right`}>
          <span
            className={`${MARKET_HEAD_SIDE_NAME_CLASS} text-[var(--no-text)]`}
          >
            {t("NO")}
          </span>
          <span className={MARKET_HEAD_SIDE_SUB_CLASS}>
            {no}% {t("PROB")}
          </span>
        </div>
      </div>
    </section>
  );
}
