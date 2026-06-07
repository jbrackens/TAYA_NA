"use client";

/**
 * DiscoverPage — sentiment-board surface for browsing crowd movement.
 *
 * /predict carries the full market-grid catalog. /discover uses the same
 * discovery data but presents it as ranked sentiment rows so it feels closer
 * to a social market pulse than another card grid.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  DiscoveryResponse,
  PredictionMarket,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import {
  dedupeMarkets,
  formatCompactUsd,
  formatTimeLeft,
  isOpenMarketStatus,
  normalizePriceShares,
} from "../components/prediction/market-display";
import { localizedMarket } from "../components/prediction/market-content";
import { deterministicDelta } from "../components/prediction/utils/spark";

const api = createPredictionClient();

const ROUTE_LOADING_CLASS = "p-20 text-center text-[13px] text-[var(--t3)]";
const GLASS_SURFACE_CLASS =
  "relative border border-white/[0.13] bg-[color:var(--glass-regular)] bg-[image:linear-gradient(180deg,_rgba(255,255,255,0.14)_0%,_rgba(255,255,255,0.05)_30%,_rgba(255,255,255,0.025)_100%)] shadow-[inset_0_1px_0_var(--rim-top),inset_0_-1px_0_var(--rim-bottom),inset_1px_0_2px_var(--chroma-1),inset_-1px_0_2px_var(--chroma-2),0_2px_6px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.28),0_16px_48px_rgba(0,0,0,0.2)] backdrop-blur-[30px] backdrop-saturate-[180%] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-[inherit] before:bg-[image:linear-gradient(180deg,_rgba(255,255,255,0.06)_0%,_transparent_100%)] before:mix-blend-overlay before:content-['']";
const DISCOVER_STATE_CARD_CLASS = `${GLASS_SURFACE_CLASS} mx-auto my-[60px] max-w-[560px] rounded-[var(--r-lg)] p-14 text-center`;
const DISCOVER_STATE_TITLE_CLASS = "m-0 text-[18px] font-bold text-[var(--t1)]";
const DISCOVER_STATE_COPY_CLASS = "mt-2 mb-0 text-[13px] text-[var(--t3)]";
const DISCOVER_INTRO_CLASS =
  "rounded-[18px] border border-[var(--border-1)] bg-[var(--surface-1)] px-7 py-7 shadow-[0_16px_44px_rgba(60,50,30,0.06)] max-[640px]:px-5 max-[640px]:py-6";
const DISCOVER_EYEBROW_CLASS =
  "mt-0 mb-2 font-['IBM_Plex_Mono',_monospace] text-[10px] uppercase tracking-[0.16em] text-[var(--yes-text)]";
const DISCOVER_TITLE_CLASS =
  "mt-0 mb-2 text-[34px] font-semibold tracking-[-0.02em] text-[var(--t1)] max-[640px]:text-[28px]";
const DISCOVER_SUB_CLASS =
  "m-0 max-w-[760px] text-[15px] leading-[1.55] text-[var(--t2)]";
const DISCOVER_PANEL_CLASS =
  "rounded-[18px] border border-[var(--border-1)] bg-[var(--surface-1)] shadow-[0_16px_44px_rgba(60,50,30,0.05)]";
const DISCOVER_PANEL_HEADER_CLASS =
  "flex items-end justify-between gap-4 border-b border-[var(--border-1)] px-5 py-4 max-[640px]:items-start max-[640px]:flex-col";
const DISCOVER_PANEL_TITLE_CLASS =
  "m-0 text-[15px] font-semibold text-[var(--t1)]";
const DISCOVER_PANEL_COPY_CLASS = "m-0 text-xs leading-[1.5] text-[var(--t3)]";
const SENTIMENT_ROW_GRID_CLASS =
  "grid grid-cols-[42px_minmax(0,1fr)_120px_128px_220px] items-center gap-4 max-[1040px]:grid-cols-[42px_minmax(0,1fr)_160px] max-[640px]:grid-cols-1";

type SentimentFilter = "all" | "trending" | "active" | "yes" | "no" | "closing";

interface Sentiment {
  label: string;
  tone: "yes" | "no" | "neutral";
  dominantSide: "YES" | "NO" | "EVEN";
  score: number;
  yesShare: number;
  noShare: number;
}

function marketKey(market: PredictionMarket): string {
  return market.id || market.ticker;
}

function getSentiment(market: PredictionMarket): Sentiment {
  const { yesShare, noShare } = normalizePriceShares(
    market.yesPriceCents,
    market.noPriceCents,
  );
  const roundedYes = Math.round(yesShare);
  const roundedNo = Math.round(noShare);

  if (roundedYes >= 60) {
    return {
      label: "Yes-leaning",
      tone: "yes",
      dominantSide: "YES",
      score: roundedYes,
      yesShare,
      noShare,
    };
  }

  if (roundedNo >= 60) {
    return {
      label: "No-leaning",
      tone: "no",
      dominantSide: "NO",
      score: roundedNo,
      yesShare,
      noShare,
    };
  }

  return {
    label: "Balanced",
    tone: "neutral",
    dominantSide: "EVEN",
    score: Math.max(roundedYes, roundedNo),
    yesShare,
    noShare,
  };
}

function rankBySignal(markets: PredictionMarket[]): PredictionMarket[] {
  return [...markets].sort((a, b) => {
    const aSentiment = getSentiment(a);
    const bSentiment = getSentiment(b);
    const aSkew = Math.abs(aSentiment.yesShare - aSentiment.noShare);
    const bSkew = Math.abs(bSentiment.yesShare - bSentiment.noShare);
    if (bSkew !== aSkew) return bSkew - aSkew;
    return b.volumeCents - a.volumeCents;
  });
}

function filterMarkets(
  markets: PredictionMarket[],
  trending: PredictionMarket[],
  closingSoon: PredictionMarket[],
  activeFilter: SentimentFilter,
): PredictionMarket[] {
  const trendingKeys = new Set(trending.map(marketKey));
  const closingKeys = new Set(closingSoon.map(marketKey));

  switch (activeFilter) {
    case "trending":
      return markets.filter((market) => trendingKeys.has(marketKey(market)));
    case "active":
      return [...markets].sort((a, b) => b.volumeCents - a.volumeCents);
    case "yes":
      return markets.filter(
        (market) => getSentiment(market).dominantSide === "YES",
      );
    case "no":
      return markets.filter(
        (market) => getSentiment(market).dominantSide === "NO",
      );
    case "closing":
      return markets.filter((market) => closingKeys.has(marketKey(market)));
    default:
      return markets;
  }
}

function averageYesShare(markets: PredictionMarket[]): number {
  if (markets.length === 0) return 0;
  const total = markets.reduce((sum, market) => {
    return (
      sum +
      normalizePriceShares(market.yesPriceCents, market.noPriceCents).yesShare
    );
  }, 0);
  return Math.round(total / markets.length);
}

function formatTicker(ticker: string): string {
  const parts = ticker.split("-");
  return parts.length > 1 ? parts.slice(0, 2).join("-") : ticker;
}

function formatCloseLabel(market: PredictionMarket): string {
  return isOpenMarketStatus(market.status)
    ? formatTimeLeft(market.closeAt)
    : market.status.replace(/_/g, " ");
}

function marketChange24h(market: PredictionMarket) {
  const leadingPrice =
    market.yesPriceCents >= market.noPriceCents
      ? market.yesPriceCents
      : market.noPriceCents;
  return deterministicDelta(market.ticker, leadingPrice);
}

function SentimentStat({
  label,
  value,
  meta,
}: {
  label: string;
  value: string | number;
  meta: string;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--border-1)] bg-[var(--surface-1)] p-4">
      <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--t3)]">
        {label}
      </p>
      <p className="mt-3 mb-1 font-mono text-[24px] font-semibold tracking-[-0.03em] text-[var(--t1)] tabular-nums">
        {value}
      </p>
      <p className="m-0 text-xs text-[var(--t3)]">{meta}</p>
    </div>
  );
}

function FilterPill({
  active,
  children,
  onClick,
  tone = "yes",
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  tone?: "yes" | "no";
}) {
  const activeClass =
    tone === "no"
      ? "border-[var(--no-bar)] bg-[var(--no-soft)] text-[var(--no-text)]"
      : "border-[var(--yes-bar)] bg-[var(--yes-soft)] text-[var(--yes-text)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-md border px-3.5 text-[13px] font-semibold transition-colors ${
        active
          ? activeClass
          : "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--t2)] hover:border-[var(--border-2)] hover:text-[var(--t1)]"
      }`}
    >
      {children}
    </button>
  );
}

function SentimentRow({
  market,
  rank,
}: {
  market: PredictionMarket;
  rank: number;
}) {
  const sentiment = getSentiment(market);
  const change = marketChange24h(market);
  const toneClass =
    sentiment.tone === "no"
      ? "bg-[var(--no-soft)] text-[var(--no-text)]"
      : sentiment.tone === "yes"
        ? "bg-[var(--yes-soft)] text-[var(--yes-text)]"
        : "bg-[var(--surface-2)] text-[var(--t2)]";
  const changeClass = change.up
    ? "text-[var(--yes-text)]"
    : "text-[var(--no-text)]";

  return (
    <article
      className={`${SENTIMENT_ROW_GRID_CLASS} border-t border-[var(--border-1)] px-5 py-4 first:border-t-0`}
    >
      <span className="font-mono text-[13px] font-semibold text-[var(--t3)] tabular-nums max-[640px]:hidden">
        {String(rank).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-['IBM_Plex_Mono',_monospace] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--yes-text)]">
            {formatTicker(market.ticker)}
          </span>
          <span
            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${toneClass}`}
          >
            {sentiment.label}
          </span>
          <span className="text-[11px] text-[var(--t3)]">
            {formatCloseLabel(market)}
          </span>
        </div>
        <Link
          href={`/market/${market.ticker}`}
          className="line-clamp-2 text-[16px] font-semibold leading-[1.35] text-[var(--t1)] no-underline hover:text-[var(--yes-text)]"
        >
          {market.title}
        </Link>
      </div>
      <div className="font-mono text-[13px] font-semibold tabular-nums max-[1040px]:col-start-2 max-[1040px]:mt-1 max-[640px]:col-start-auto">
        <span className={changeClass}>
          {change.up ? "+" : ""}
          {change.pct.toFixed(1)}%
        </span>
      </div>
      <div className="font-mono text-[13px] font-semibold text-[var(--t2)] tabular-nums max-[1040px]:col-start-2 max-[1040px]:mt-[-10px] max-[640px]:col-start-auto">
        {formatCompactUsd(market.volumeCents)}
      </div>
      <div className="grid grid-cols-2 gap-2 max-[1040px]:col-start-3 max-[1040px]:row-span-2 max-[1040px]:row-start-1 max-[640px]:col-start-auto max-[640px]:row-auto">
        <Link
          href={`/market/${market.ticker}?side=yes`}
          className="flex min-h-10 items-center justify-between gap-2 rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] px-3 text-[12px] font-semibold no-underline hover:border-[var(--yes-bar)] hover:bg-[var(--yes-soft)]"
        >
          <span className="text-[var(--yes-text)]">YES</span>
          <span className="font-mono text-[15px] text-[var(--yes-text)] tabular-nums">
            {market.yesPriceCents}¢
          </span>
        </Link>
        <Link
          href={`/market/${market.ticker}?side=no`}
          className="flex min-h-10 items-center justify-between gap-2 rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] px-3 text-[12px] font-semibold no-underline hover:border-[var(--no-bar)] hover:bg-[var(--no-soft)]"
        >
          <span className="text-[var(--no-text)]">NO</span>
          <span className="font-mono text-[15px] text-[var(--no-text)] tabular-nums">
            {market.noPriceCents}¢
          </span>
        </Link>
      </div>
    </article>
  );
}

export default function DiscoverPage() {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<SentimentFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getDiscovery()
      .then((d) => {
        if (!cancelled) setDiscovery(d);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className={ROUTE_LOADING_CLASS}>{t("DISCOVER_LOADING")}</div>;
  }

  if (error) {
    return (
      <div className={DISCOVER_STATE_CARD_CLASS}>
        <h2 className={DISCOVER_STATE_TITLE_CLASS}>
          {t("DISCOVER_LOAD_ERROR_TITLE")}
        </h2>
        <p className={DISCOVER_STATE_COPY_CLASS}>{error}</p>
      </div>
    );
  }

  const trending = discovery?.trending ?? [];
  const closingSoon = discovery?.closingSoon ?? [];
  const localizedTrending = trending.map((market) =>
    localizedMarket(contentT, market),
  );
  const localizedClosingSoon = closingSoon.map((market) =>
    localizedMarket(contentT, market),
  );
  const allMarkets = rankBySignal(
    dedupeMarkets([...localizedTrending, ...localizedClosingSoon]),
  );

  if (allMarkets.length === 0) {
    return (
      <div className={DISCOVER_STATE_CARD_CLASS}>
        <h2 className={DISCOVER_STATE_TITLE_CLASS}>
          {t("DISCOVER_EMPTY_TITLE")}
        </h2>
        <p className={DISCOVER_STATE_COPY_CLASS}>{t("DISCOVER_EMPTY_COPY")}</p>
      </div>
    );
  }

  const filteredMarkets = filterMarkets(
    allMarkets,
    localizedTrending,
    localizedClosingSoon,
    activeFilter,
  );
  const totalVolume = allMarkets.reduce(
    (sum, market) => sum + market.volumeCents,
    0,
  );
  const yesLeaningCount = allMarkets.filter(
    (market) => getSentiment(market).dominantSide === "YES",
  ).length;
  const noLeaningCount = allMarkets.filter(
    (market) => getSentiment(market).dominantSide === "NO",
  ).length;
  const filterOptions: Array<{ key: SentimentFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "trending", label: "Trending" },
    { key: "active", label: "Most active" },
    { key: "yes", label: "Strong Yes" },
    { key: "no", label: "Strong No" },
    { key: "closing", label: "Closing soon" },
  ];

  return (
    <div className="grid gap-5">
      <header className={DISCOVER_INTRO_CLASS}>
        <p className={DISCOVER_EYEBROW_CLASS}>Discover / Sentiment</p>
        <h1 className={DISCOVER_TITLE_CLASS}>Market sentiment</h1>
        <p className={DISCOVER_SUB_CLASS}>
          Track the questions drawing the strongest Yes-or-No conviction,
          movement, and closing pressure across Tiangge.
        </p>
      </header>

      <section className="grid grid-cols-4 gap-3 max-[1040px]:grid-cols-2 max-[560px]:grid-cols-1">
        <SentimentStat
          label="Crowd average"
          value={`${averageYesShare(allMarkets)}% Yes`}
          meta={`${allMarkets.length} markets tracked`}
        />
        <SentimentStat
          label="Yes-leaning"
          value={yesLeaningCount}
          meta="above 60% Yes consensus"
        />
        <SentimentStat
          label="No-leaning"
          value={noLeaningCount}
          meta="above 60% No consensus"
        />
        <SentimentStat
          label="Volume pulse"
          value={formatCompactUsd(totalVolume)}
          meta="from discovery markets"
        />
      </section>

      <nav
        className="flex gap-2 overflow-x-auto pb-1"
        aria-label="Sentiment filters"
      >
        {filterOptions.map((option) => (
          <FilterPill
            key={option.key}
            active={activeFilter === option.key}
            onClick={() => setActiveFilter(option.key)}
            tone={option.key === "no" ? "no" : "yes"}
          >
            {option.label}
          </FilterPill>
        ))}
      </nav>

      <section className={DISCOVER_PANEL_CLASS}>
        <div className={DISCOVER_PANEL_HEADER_CLASS}>
          <div>
            <h2 className={DISCOVER_PANEL_TITLE_CLASS}>Trending sentiment</h2>
            <p className={DISCOVER_PANEL_COPY_CLASS}>
              Ranked by crowd skew, then activity.
            </p>
          </div>
          <span className="font-mono text-xs text-[var(--t3)] tabular-nums">
            {filteredMarkets.length} markets
          </span>
        </div>
        <div
          className={`${SENTIMENT_ROW_GRID_CLASS} border-b border-[var(--border-1)] px-5 py-2.5 font-['IBM_Plex_Mono',_monospace] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--t3)] max-[640px]:hidden`}
          aria-hidden="true"
        >
          <span>#</span>
          <span>Market</span>
          <span>% Change 24h</span>
          <span>Volume</span>
          <span className="text-right">Yes / No</span>
        </div>
        {filteredMarkets.map((market, index) => (
          <SentimentRow
            key={marketKey(market)}
            market={market}
            rank={index + 1}
          />
        ))}
      </section>
    </div>
  );
}
