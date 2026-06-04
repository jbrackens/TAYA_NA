"use client";

/**
 * MarketCard — P8 composition (DESIGN.md §6).
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │ Title clamped to 2 lines               [⊙ image]    │
 *   ├─────────────────────────────────────────────────────┤
 *   │ ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  7%    93%   │
 *   ├─────────────────────────────────────────────────────┤
 *   │ [ YES   7¢ ]            [ NO   93¢ ]                 │
 *   ├─────────────────────────────────────────────────────┤
 *   │ Volume  $25K                 Closes  Dec 31, 2026   │
 *   └─────────────────────────────────────────────────────┘
 *
 * Header is title + corner image only (no category eyebrow — category is
 * implied by the surface the card sits on). The bar shows the visual
 * YES/NO split; the pills show the execution price — the same number for
 * binary contracts, but different jobs. Secondary stats (volume, close
 * date) drop to a quiet footer below the pills so the card reads
 * title → probability → trade affordance without metadata competing.
 *
 * Percentage labels sit above the bar so the bar itself can stay slim and
 * true to the actual YES/NO split.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  formatCompactUsd,
  isOpenMarketStatus,
  marketStatusLabel,
} from "./market-display";
import { getMarketImageProps } from "./utils/marketImage";

interface MarketCardProps {
  ticker: string;
  title: string;
  yesPriceCents: number;
  noPriceCents: number;
  volumeCents: number;
  liquidityCents?: number;
  closeAt: string;
  status: string;
  categoryLabel?: string;
  imagePath?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
}

function formatCloseAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const monogramBgClasses: Record<string, string> = {
  "bg-blue": "bg-[#3b82f6]",
  "bg-orange": "bg-[#f59e0b]",
  "bg-emerald": "bg-[#10b981]",
  "bg-purple": "bg-[#8b5cf6]",
  "bg-cyan": "bg-[#06b6d4]",
  "bg-green": "bg-[#22c55e]",
  "bg-slate": "bg-[#64748b]",
};

export function MarketCard({
  ticker,
  title,
  yesPriceCents,
  noPriceCents,
  volumeCents,
  closeAt,
  status,
  categoryLabel,
  imagePath,
  imageUrl,
  image_url,
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

  return (
    <article className="flex flex-col gap-3.5 rounded-[14px] border border-[var(--border-1)] bg-[var(--surface-1)] p-5 font-sans text-[var(--t1)] transition-[transform,box-shadow,border-color] duration-[140ms] hover:-translate-y-0.5 hover:border-[var(--border-2)] hover:shadow-[0_10px_24px_rgba(60,50,30,0.08)] focus-within:-translate-y-0.5 focus-within:border-[var(--border-2)] focus-within:shadow-[0_10px_24px_rgba(60,50,30,0.08)]">
      {/* The card body links to the market detail page (no preselect).
       * The YES/NO pills below are SIBLING links carrying ?side=yes|no
       * so clicking a pill deep-links into a side-preselected ticket.
       * Avoids invalid nested anchors. */}
      <Link
        href={`/market/${ticker}`}
        className="flex flex-col gap-3.5 text-inherit no-underline"
        aria-label={t("MARKET_CARD_LABEL", {
          title,
          yes: yesPriceCents,
          no: noPriceCents,
        })}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-auto flex-col gap-2">
            <h3 className="m-0 line-clamp-2 min-h-[calc(16px*1.3*2)] overflow-hidden text-base font-semibold leading-[1.3] text-[var(--t1)]">
              {title}
            </h3>
          </div>
          {visibleImage.kind === "image" ? (
            <img
              className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full object-cover text-[15px] font-bold text-white"
              src={visibleImage.src}
              alt=""
              aria-hidden="true"
              onError={() => setFailedImageSrc(visibleImage.src)}
            />
          ) : (
            <span
              className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-full font-sans text-[15px] font-bold text-white ${monogramBgClasses[visibleImage.bgClass] ?? monogramBgClasses["bg-slate"]}`}
              aria-hidden="true"
            >
              {visibleImage.monogram}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-[5px]">
          <div
            className="flex items-center justify-between leading-none"
            aria-hidden="true"
          >
            <span className="font-mono text-xs font-bold tabular-nums text-[var(--yes-text)]">
              {yesPriceCents}%
            </span>
            <span className="font-mono text-xs font-bold tabular-nums text-[var(--no-text)]">
              {noPriceCents}%
            </span>
          </div>
          <svg
            className="h-3.5 w-full overflow-hidden rounded-md bg-[var(--surface-2)]"
            viewBox="0 0 100 14"
            preserveAspectRatio="none"
            role="img"
            aria-label={t("MARKET_BAR_LABEL", {
              yes: yesPriceCents,
              no: noPriceCents,
            })}
          >
            <rect width={yesPriceCents} height="14" fill="var(--yes-bar)" />
            <rect
              x={yesPriceCents}
              width={noPriceCents}
              height="14"
              fill="var(--no-bar)"
            />
          </svg>
        </div>
      </Link>

      <div className="flex gap-2.5">
        <Link
          href={`/market/${ticker}?side=yes`}
          className="flex min-h-9 flex-1 items-center justify-between gap-2 rounded-full border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-1.5 font-sans no-underline transition-colors duration-150 hover:border-[var(--yes-bar)] hover:bg-[var(--yes-soft)] max-[768px]:min-h-10 max-[768px]:py-[7px]"
          aria-label={t("BUY_YES_AT", { price: yesPriceCents })}
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--yes-text)]">
            {t("YES")}
          </span>
          <span className="font-mono text-base font-semibold tracking-normal text-[var(--yes-text)] tabular-nums">
            {yesPriceCents}¢
          </span>
        </Link>
        <Link
          href={`/market/${ticker}?side=no`}
          className="flex min-h-9 flex-1 items-center justify-between gap-2 rounded-full border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-1.5 font-sans no-underline transition-colors duration-150 hover:border-[var(--no-bar)] hover:bg-[var(--no-soft)] max-[768px]:min-h-10 max-[768px]:py-[7px]"
          aria-label={t("BUY_NO_AT", { price: noPriceCents })}
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--no-text)]">
            {t("NO")}
          </span>
          <span className="font-mono text-base font-semibold tracking-normal text-[var(--no-text)] tabular-nums">
            {noPriceCents}¢
          </span>
        </Link>
      </div>

      {/* Secondary stats sit in a quiet footer below the bar + pills.
       * Plain text, not a link — the body link above owns navigation. */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="inline-flex items-baseline gap-1.5 whitespace-nowrap text-xs">
          <span className="font-medium text-[var(--t3)]">{t("VOLUME")}</span>
          <span className="font-mono text-[13px] font-semibold text-[var(--t1)] tabular-nums">
            {formatCompactUsd(volumeCents)}
          </span>
        </div>
        <div className="inline-flex items-baseline gap-1.5 whitespace-nowrap text-xs">
          <span className="font-medium text-[var(--t3)]">
            {isOpen ? t("CLOSES") : t("STATUS")}
          </span>
          <span className="font-mono text-[13px] font-semibold text-[var(--t1)] tabular-nums">
            {isOpen ? formatCloseAt(closeAt) : marketStatusLabel(status, t)}
          </span>
        </div>
      </div>
    </article>
  );
}
