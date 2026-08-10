"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StarIcon as Star } from "@phosphor-icons/react/dist/csr/Star";
import { formatCompactPoints } from "../../lib/points";
import { isOpenMarketStatus, marketStatusLabel } from "./market-display";
import { calculateMarketSentiment } from "./marketSentiment";
import { getMarketImageProps } from "./utils/marketImage";

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
  imagePath?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  watched?: boolean;
  onToggleWatchlist?: (marketId: string) => void;
}

function formatCloseAt(iso: string): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

const MONOGRAM_CLASS =
  "border border-[var(--border-1)] bg-[var(--surface-2)] text-[var(--t3)]";

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
  imagePath,
  imageUrl,
  image_url,
  watched = false,
  onToggleWatchlist,
}: MarketCardProps) {
  const { t } = useTranslation("prediction");
  const isOpen = isOpenMarketStatus(status);
  const image = getMarketImageProps({
    ticker,
    imagePath,
    imageUrl,
    image_url,
    categoryLabel,
  });
  const imageSrc = image.kind === "image" ? image.src : "";
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);

  useEffect(() => {
    setFailedImageSrc(null);
  }, [imageSrc]);

  const fallbackImage = getMarketImageProps({ ticker, categoryLabel });
  const visibleImage =
    image.kind === "image" && failedImageSrc !== image.src
      ? image
      : fallbackImage;
  // Sentiment presentation matches the swept MarketFeed idiom (the pinned
  // "sentiment sentence, not probability pill" decision): a thin
  // direction-colored bar — Rule 2 allows direction on bars — plus an 11px
  // sentence. The old treatment here (15px semibold red sentence + colored
  // dot) made an opinion the loudest element of every card
  // (/design-review FINDING-001, 2026-08-10).
  const sentiment = calculateMarketSentiment(yesPricePoints);
  const sentimentTextClass =
    sentiment.sentimentState === "neutral"
      ? "text-[var(--t3)]"
      : sentiment.sentimentState === "yes"
        ? "text-[var(--yes-text)]"
        : "text-[var(--no-text)]";
  const sentimentBarClass =
    sentiment.sentimentState === "neutral"
      ? "bg-[var(--border-2)]"
      : sentiment.sentimentState === "yes"
        ? "bg-[var(--yes-bar)]"
        : "bg-[var(--no-bar)]";
  const leadPct =
    sentiment.sentimentState === "no" ? noPricePoints : yesPricePoints;

  return (
    <article className="relative flex h-full min-h-[248px] flex-col rounded-[12px] border border-[var(--border-1)] bg-[var(--surface-1)] p-5 font-sans text-[var(--t1)] transition-[transform,box-shadow,border-color] duration-[140ms] hover:-translate-y-0.5 hover:border-[var(--border-2)] hover:shadow-[var(--shadow-card-hover)] focus-within:-translate-y-0.5 focus-within:border-[var(--border-2)] focus-within:shadow-[var(--shadow-card-hover)] max-[640px]:min-h-[238px] max-[640px]:p-4">
      {onToggleWatchlist && (
        <button
          type="button"
          className={`absolute right-1.5 top-1.5 z-10 grid h-11 w-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent transition-colors duration-150 ${
            watched
              ? "text-[var(--accent-text)]"
              : "text-[var(--t4)] hover:bg-[rgba(13,17,20,0.05)] hover:text-[var(--t2)]"
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
            size={18}
            weight={watched ? "fill" : "regular"}
            aria-hidden="true"
          />
        </button>
      )}

      <Link
        href={`/market/${ticker}`}
        className="flex flex-1 flex-col text-inherit no-underline"
        aria-label={title}
      >
        <div className="flex items-start gap-3 pr-8">
          {visibleImage.kind === "image" ? (
            <img
              className="h-10 w-10 flex-none rounded-full object-cover"
              src={visibleImage.src}
              alt=""
              aria-hidden="true"
              onError={() => setFailedImageSrc(visibleImage.src)}
            />
          ) : (
            <span
              className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-full font-sans text-[12px] font-bold ${MONOGRAM_CLASS}`}
              aria-hidden="true"
            >
              {visibleImage.monogram}
            </span>
          )}
          <h3
            className="m-0 min-h-[44px] min-w-0 flex-auto overflow-hidden text-[17px] font-semibold leading-[1.3] text-[var(--t1)] max-[640px]:min-h-[42px] max-[640px]:text-base"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {title}
          </h3>
        </div>

        <div className="mt-5 flex min-h-[40px] items-center gap-2 max-[640px]:mt-4">
          <span className="block h-1.5 flex-1 overflow-hidden rounded-[var(--r-pill)] bg-[var(--surface-2)]">
            <span
              className={`block h-full rounded-[var(--r-pill)] ${sentimentBarClass}`}
              style={{ width: `${Math.max(0, Math.min(100, leadPct))}%` }}
            />
          </span>
          <span
            className={`flex-none whitespace-nowrap text-[11px] font-medium ${sentimentTextClass}`}
          >
            {t(sentiment.displayStringKey, {
              percentage: sentiment.percentage,
            })}
          </span>
        </div>
      </Link>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Link
          href={`/market/${ticker}?side=yes`}
          className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] px-3.5 py-2 font-sans no-underline transition-colors duration-150 hover:border-[var(--yes-bar)] hover:bg-[var(--yes-soft)] max-[768px]:min-h-11"
          aria-label={t("BUY_YES")}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--yes-text)]">
            {t("YES")}
          </span>
          <span className="font-mono text-[16px] font-semibold text-[var(--yes-text)] tabular-nums">
            {yesPricePoints}¢
          </span>
        </Link>
        <Link
          href={`/market/${ticker}?side=no`}
          className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] px-3.5 py-2 font-sans no-underline transition-colors duration-150 hover:border-[var(--no-bar)] hover:bg-[var(--no-soft)] max-[768px]:min-h-11"
          aria-label={t("BUY_NO")}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--no-text)]">
            {t("NO")}
          </span>
          <span className="font-mono text-[16px] font-semibold text-[var(--no-text)] tabular-nums">
            {noPricePoints}¢
          </span>
        </Link>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-[var(--border-1)] pt-3 text-[12px] text-[var(--t3)]">
        <span className="truncate">
          {t("VOLUME")}{" "}
          <span className="font-mono font-semibold text-[var(--t2)] tabular-nums">
            {formatCompactPoints(volumePoints)}
          </span>
        </span>
        <span className="shrink-0">
          {isOpen ? t("CLOSES") : t("STATUS")}{" "}
          <span className="font-mono font-semibold text-[var(--t2)] tabular-nums">
            {isOpen ? formatCloseAt(closeAt) : marketStatusLabel(status, t)}
          </span>
        </span>
      </div>
    </article>
  );
}
