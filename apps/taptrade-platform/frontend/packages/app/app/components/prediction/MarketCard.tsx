"use client";

/**
 * MarketCard — an editorial BRIEF (P11 "Standing Question", 2026-07-12).
 *
 *   ────────────────────────────────  ← hairline rule
 *   POLITICS                      ☆
 *   Will the Senate flip in 2026?    ← serif headline
 *   Market prices No at 62%          ← movement sentence
 *   YES 38¢   ·   NO 62¢             ← wire line (sibling deep-links)
 *   Vol 1.3M pts · Closes Jul 21     ← footnote
 *
 * Text-first: the P9/P10 card chrome (image circle, shadow card, pill
 * buttons) is retired — a brief is a rule, a headline, and figures.
 * The body links to the market page; the YES/NO wire figures are
 * SIBLING links carrying ?side= so a tap deep-links a side-preselected
 * ticket (no nested anchors).
 */

import Link from "next/link";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  formatCompactPoints,
  isOpenMarketStatus,
  marketStatusLabel,
} from "./market-display";
import { calculateMarketSentiment } from "./marketSentiment";

interface MarketCardProps {
  marketId: string;
  ticker: string;
  title: string;
  yesPricePoints: number;
  noPricePoints: number;
  volumePoints: number;
  closeAt: string;
  status: string;
  categoryLabel?: string;
  /** Image props accepted for API compatibility; briefs are text-first. */
  imagePath?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  watched?: boolean;
  onToggleWatchlist?: (marketId: string) => void;
}

function formatCloseAt(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function MarketCard({
  marketId,
  ticker,
  title,
  yesPricePoints,
  noPricePoints,
  volumePoints,
  closeAt,
  status,
  categoryLabel,
  watched = false,
  onToggleWatchlist,
}: MarketCardProps) {
  const { t } = useTranslation("prediction");
  const isOpen = isOpenMarketStatus(status);
  const marketSentiment = calculateMarketSentiment(yesPricePoints);
  const trendClassName =
    marketSentiment.sentimentState === "neutral"
      ? "text-[var(--t3)]"
      : marketSentiment.sentimentState === "yes"
        ? "text-[var(--yes-text)]"
        : "text-[var(--no-text)]";

  return (
    <article className="relative flex h-full min-h-[184px] flex-col border-t border-[var(--border-2)] pt-3 font-sans text-[var(--t1)]">
      {onToggleWatchlist && (
        <button
          type="button"
          className={`absolute right-0 top-2 z-10 grid h-9 w-9 cursor-pointer place-items-center border-0 bg-transparent transition-colors duration-150 ${
            watched
              ? "text-[var(--accent-text)]"
              : "text-[var(--t4)] hover:text-[var(--t1)]"
          }`}
          aria-pressed={watched}
          aria-label={
            watched
              ? t("REMOVE_FROM_WATCHLIST", "Remove from watchlist")
              : t("ADD_TO_WATCHLIST", "Add to watchlist")
          }
          onClick={() => onToggleWatchlist(marketId)}
        >
          <Star
            size={15}
            fill={watched ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>
      )}

      <Link
        href={`/market/${ticker}`}
        className="flex flex-1 flex-col text-inherit no-underline"
        aria-label={title}
      >
        {categoryLabel && (
          <span className="mb-1.5 pr-9 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--t3)]">
            {categoryLabel}
          </span>
        )}
        <h3
          className="type-display m-0 min-h-[2.5em] pr-9 text-[19px] font-medium leading-[1.22] text-[var(--t1)] [display:-webkit-box] [overflow:hidden] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]"
          title={title}
        >
          {title}
        </h3>

        <p
          className={`m-0 mt-2 min-h-[1.4em] text-[12px] font-medium leading-snug ${trendClassName}`}
        >
          {t(marketSentiment.displayStringKey, {
            percentage: marketSentiment.percentage,
          })}
        </p>
      </Link>

      {/* The wire line: labeled side figures, sibling deep-links. The
          links LOOK like print figures but keep firm tap sizes via
          padded hit areas (min-h-10, margin-compensated). */}
      <div className="mt-1.5 flex items-center gap-6 font-mono text-[14px] font-semibold [font-variant-numeric:tabular-nums]">
        <Link
          href={`/market/${ticker}?side=yes`}
          className="group -mx-1 inline-flex min-h-10 items-center gap-1.5 px-1 text-[var(--yes-text)] no-underline max-[768px]:min-h-11"
          aria-label={t("BUY_YES_AT", {
            price: yesPricePoints,
            defaultValue: "Buy Yes at {{price}}¢",
          })}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.08em]">
            {t("YES")}
          </span>
          <span className="border-b border-transparent group-hover:border-[var(--yes-text)]">
            {yesPricePoints}¢
          </span>
        </Link>
        <Link
          href={`/market/${ticker}?side=no`}
          className="group -mx-1 inline-flex min-h-10 items-center gap-1.5 px-1 text-[var(--no-text)] no-underline max-[768px]:min-h-11"
          aria-label={t("BUY_NO_AT", {
            price: noPricePoints,
            defaultValue: "Buy No at {{price}}¢",
          })}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.08em]">
            {t("NO")}
          </span>
          <span className="border-b border-transparent group-hover:border-[var(--no-text)]">
            {noPricePoints}¢
          </span>
        </Link>
      </div>

      {/* Footnote line. */}
      <div className="mt-2.5 flex items-baseline justify-between gap-3 font-mono text-[11px] text-[var(--t4)] [font-variant-numeric:tabular-nums]">
        <span className="truncate">
          {t("VOLUME")}{" "}
          <span className="text-[var(--t2)]">
            {formatCompactPoints(volumePoints)}
          </span>
        </span>
        <span className="shrink-0">
          {isOpen ? t("CLOSES") : t("STATUS")}{" "}
          <span className="text-[var(--t2)]">
            {isOpen ? formatCloseAt(closeAt) : marketStatusLabel(status, t)}
          </span>
        </span>
      </div>
    </article>
  );
}
