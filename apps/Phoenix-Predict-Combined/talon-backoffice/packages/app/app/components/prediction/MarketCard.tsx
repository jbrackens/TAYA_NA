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
import { useTranslation } from "react-i18next";
import { formatCompactUsd } from "./market-display";
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
  imagePath?: string;
}

function formatCloseAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MarketCard({
  ticker,
  title,
  yesPriceCents,
  noPriceCents,
  volumeCents,
  closeAt,
  categoryLabel,
  imagePath,
}: MarketCardProps) {
  const { t } = useTranslation("prediction");

  const image = getMarketImageProps({ ticker, imagePath, categoryLabel });

  return (
    <>
      <MarketCardStyles />
      {/* The card body links to the market detail page (no preselect).
       * The YES/NO pills below are SIBLING links carrying ?side=yes|no
       * so clicking a pill deep-links into a side-preselected ticket.
       * Avoids invalid nested anchors. */}
      <article className="mkt">
        <Link
          href={`/market/${ticker}`}
          className="mkt-body"
          aria-label={t("MARKET_CARD_LABEL", {
            title,
            yes: yesPriceCents,
            no: noPriceCents,
          })}
        >
          <div className="mkt-head">
            <div className="mkt-head-text">
              <h3 className="mkt-title">{title}</h3>
            </div>
            {image.kind === "image" ? (
              <img
                className="mkt-img"
                src={image.src}
                alt=""
                aria-hidden="true"
              />
            ) : (
              <span
                className={`mkt-img mkt-img-mono ${image.bgClass}`}
                aria-hidden="true"
              >
                {image.monogram}
              </span>
            )}
          </div>

          <div className="mkt-prob">
            <div className="mkt-bar-labels" aria-hidden="true">
              <span className="mkt-bar-pct mkt-bar-pct-yes">
                {yesPriceCents}%
              </span>
              <span className="mkt-bar-pct mkt-bar-pct-no">
                {noPriceCents}%
              </span>
            </div>
            <div
              className="mkt-bar"
              role="img"
              aria-label={t("MARKET_BAR_LABEL", {
                yes: yesPriceCents,
                no: noPriceCents,
              })}
            >
              <span
                className="mkt-bar-yes"
                style={{ width: `${yesPriceCents}%` }}
              />
              <span
                className="mkt-bar-no"
                style={{ width: `${noPriceCents}%` }}
              />
            </div>
          </div>
        </Link>

        <div className="mkt-pills">
          <Link
            href={`/market/${ticker}?side=yes`}
            className="mkt-pill mkt-pill-yes"
            aria-label={t("BUY_YES_AT", { price: yesPriceCents })}
          >
            <span className="mkt-pill-label">{t("YES")}</span>
            <span className="mkt-pill-price">{yesPriceCents}¢</span>
          </Link>
          <Link
            href={`/market/${ticker}?side=no`}
            className="mkt-pill mkt-pill-no"
            aria-label={t("BUY_NO_AT", { price: noPriceCents })}
          >
            <span className="mkt-pill-label">{t("NO")}</span>
            <span className="mkt-pill-price">{noPriceCents}¢</span>
          </Link>
        </div>

        {/* Secondary stats sit in a quiet footer below the bar + pills.
         * Plain text, not a link — the body link above owns navigation. */}
        <div className="mkt-stats">
          <div className="mkt-stat">
            <span className="mkt-stat-label">{t("VOLUME")}</span>
            <span className="mkt-stat-value">
              {formatCompactUsd(volumeCents)}
            </span>
          </div>
          <div className="mkt-stat">
            <span className="mkt-stat-label">{t("CLOSES")}</span>
            <span className="mkt-stat-value">{formatCloseAt(closeAt)}</span>
          </div>
        </div>
      </article>
    </>
  );
}

function MarketCardStyles() {
  return (
    <style>{`
      .mkt {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 20px;
        background: var(--surface-1);
        border: 1px solid var(--border-1);
        border-radius: 14px;
        color: var(--t1);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
      }
      .mkt:hover,
      .mkt:focus-within {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(60, 50, 30, 0.08);
        border-color: var(--border-2);
      }
      .mkt-body {
        display: flex;
        flex-direction: column;
        gap: 14px;
        text-decoration: none;
        color: inherit;
      }

      .mkt-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .mkt-head-text {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .mkt-title {
        font-size: 16px;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.01em;
        color: var(--t1);
        margin: 0;
        /* Reserve 2 lines so a card with a single-line title sits at the
         * same height as one whose title wraps. Without this, every card
         * with a wrapped title bumps its bar (and pills) down ~20px,
         * which surfaces as "the bar graph is higher on some cards" once
         * the eye scans across a row. */
        min-height: calc(16px * 1.3 * 2);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .mkt-img {
        flex: 0 0 auto;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        object-fit: cover;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: 'Inter Tight', 'Inter', sans-serif;
        font-weight: 700;
        font-size: 15px;
        letter-spacing: -0.01em;
        color: #fff;
      }
      .mkt-img-mono.bg-blue { background: #3b82f6; }
      .mkt-img-mono.bg-orange { background: #f59e0b; }
      .mkt-img-mono.bg-emerald { background: #10b981; }
      .mkt-img-mono.bg-purple { background: #8b5cf6; }
      .mkt-img-mono.bg-cyan { background: #06b6d4; }
      .mkt-img-mono.bg-green { background: #22c55e; }
      .mkt-img-mono.bg-slate { background: #64748b; }

      .mkt-stats {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }
      .mkt-stat {
        display: inline-flex;
        align-items: baseline;
        gap: 6px;
        font-size: 12px;
        white-space: nowrap;
      }
      .mkt-stat-label {
        color: var(--t3);
        font-weight: 500;
      }
      .mkt-stat-value {
        color: var(--t1);
        font-family: 'IBM Plex Mono', monospace;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        font-size: 13px;
      }

      .mkt-prob {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .mkt-bar-labels {
        display: flex;
        align-items: center;
        justify-content: space-between;
        line-height: 1;
      }
      .mkt-bar-pct {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.01em;
      }
      .mkt-bar-pct-yes { color: var(--yes-text); }
      .mkt-bar-pct-no  { color: var(--no-text); }

      .mkt-bar {
        display: flex;
        height: 14px;
        border-radius: 6px;
        overflow: hidden;
        background: var(--surface-2);
      }
      .mkt-bar-yes,
      .mkt-bar-no {
        display: inline-flex;
        align-items: center;
        transition: width 200ms ease;
        min-width: 0;
      }
      .mkt-bar-yes { background: var(--yes-bar); }
      .mkt-bar-no  { background: var(--no-bar); }

      .mkt-pills {
        display: flex;
        gap: 10px;
      }
      .mkt-pill {
        flex: 1 1 0;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 38px;
        padding: 6px 12px;
        background: var(--surface-2);
        border: 1px solid var(--border-1);
        border-radius: 999px;
        font-family: 'Inter', sans-serif;
        text-decoration: none;
        transition: background 120ms ease, border-color 120ms ease;
      }
      .mkt-pill-yes:hover {
        background: var(--yes-soft);
        border-color: var(--yes-bar);
      }
      .mkt-pill-no:hover {
        background: var(--no-soft);
        border-color: var(--no-bar);
      }
      .mkt-pill-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
      }
      .mkt-pill-price {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 16px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
      }
      .mkt-pill-yes .mkt-pill-label,
      .mkt-pill-yes .mkt-pill-price {
        color: var(--yes-text);
      }
      .mkt-pill-no .mkt-pill-label,
      .mkt-pill-no .mkt-pill-price {
        color: var(--no-text);
      }
      @media (max-width: 768px) {
        .mkt-pill {
          min-height: 40px;
          padding: 7px 12px;
        }
      }
    `}</style>
  );
}
