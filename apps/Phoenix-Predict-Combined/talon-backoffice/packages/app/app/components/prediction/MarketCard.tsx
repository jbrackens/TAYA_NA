"use client";

/**
 * MarketCard — P8 composition (DESIGN.md §6).
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │ [CATEGORY]                              [⊙ image]   │
 *   │ Title clamped to 2 lines                            │
 *   ├─────────────────────────────────────────────────────┤
 *   │ ▢ Volume                              $25K          │
 *   │ ▢ Closes                       Dec 31, 2026         │
 *   │ ▢ Open interest                  37.94 NO           │
 *   ├─────────────────────────────────────────────────────┤
 *   │ ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  7%    93%  │
 *   ├─────────────────────────────────────────────────────┤
 *   │ [ YES   7¢ ]            [ NO   93¢ ]                │
 *   └─────────────────────────────────────────────────────┘
 *
 * Replaces the post-P3 sparkline + dual-mono-prices + delta-pill card.
 * The bar shows the visual split; the pills show the execution price —
 * mathematically the same number for binary contracts but different jobs.
 *
 * Min-segment-width rule (DESIGN.md §6, from 2026-04-28 amendment): when
 * a side is ≤5% the corresponding bar segment renders at min-width 12px
 * (anything narrower disappears + can't carry overlaid text). The %
 * label moves above the bar instead of being overlaid on a sliver.
 */

import Link from "next/link";
import { formatCompactUsd } from "./market-display";
import { getMarketImageProps } from "./utils/marketImage";

interface MarketCardProps {
  ticker: string;
  title: string;
  yesPriceCents: number;
  noPriceCents: number;
  volumeCents: number;
  openInterestCents?: number;
  liquidityCents?: number;
  closeAt: string;
  status: string;
  categoryLabel?: string;
  imagePath?: string;
}

const MIN_SEGMENT_PX = 12;
const SMALL_THRESHOLD_PCT = 5;

function formatCloseAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatOpenInterest(
  openInterestCents: number | undefined,
  yesLeads: boolean,
): string {
  if (!openInterestCents) return "—";
  // Show as "$X NO" or "$X YES" — leading-side label gives a quick read of
  // which side has more conviction (Robinhood convention).
  return `${formatCompactUsd(openInterestCents)} ${yesLeads ? "YES" : "NO"}`;
}

export function MarketCard({
  ticker,
  title,
  yesPriceCents,
  noPriceCents,
  volumeCents,
  openInterestCents,
  closeAt,
  categoryLabel,
  imagePath,
}: MarketCardProps) {
  const cat = (categoryLabel || ticker.split("-")[0]).toUpperCase();
  const yesLeads = yesPriceCents >= noPriceCents;

  const yesIsExtreme = yesPriceCents <= SMALL_THRESHOLD_PCT;
  const noIsExtreme = noPriceCents <= SMALL_THRESHOLD_PCT;

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
          aria-label={`${title}, YES ${yesPriceCents} cents, NO ${noPriceCents} cents`}
        >
          <div className="mkt-head">
            <div className="mkt-head-text">
              <span className="mkt-cat">{cat}</span>
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

          <div className="mkt-stats">
            <div className="mkt-stat-row">
              <span className="mkt-stat-label">Volume</span>
              <span className="mkt-stat-value">
                {formatCompactUsd(volumeCents)}
              </span>
            </div>
            <div className="mkt-stat-row">
              <span className="mkt-stat-label">Closes</span>
              <span className="mkt-stat-value">{formatCloseAt(closeAt)}</span>
            </div>
            <div className="mkt-stat-row">
              <span className="mkt-stat-label">Open interest</span>
              <span className="mkt-stat-value">
                {formatOpenInterest(openInterestCents, yesLeads)}
              </span>
            </div>
          </div>

          {(yesIsExtreme || noIsExtreme) && (
            <div className="mkt-bar-overlay-out">
              {yesIsExtreme && (
                <span className="mkt-bar-out-pct mkt-bar-out-yes">
                  YES {yesPriceCents}%
                </span>
              )}
              {noIsExtreme && (
                <span className="mkt-bar-out-pct mkt-bar-out-no">
                  NO {noPriceCents}%
                </span>
              )}
            </div>
          )}

          <div
            className="mkt-bar"
            role="img"
            aria-label={`${yesPriceCents} percent YES, ${noPriceCents} percent NO`}
          >
            <span
              className="mkt-bar-yes"
              style={
                yesIsExtreme
                  ? { width: `${MIN_SEGMENT_PX}px` }
                  : noIsExtreme
                    ? { width: `calc(100% - ${MIN_SEGMENT_PX}px)` }
                    : { width: `${yesPriceCents}%` }
              }
            >
              {!yesIsExtreme && (
                <span className="mkt-bar-pct">{yesPriceCents}%</span>
              )}
            </span>
            <span
              className="mkt-bar-no"
              style={
                noIsExtreme
                  ? { width: `${MIN_SEGMENT_PX}px` }
                  : yesIsExtreme
                    ? { width: `calc(100% - ${MIN_SEGMENT_PX}px)` }
                    : { width: `${noPriceCents}%` }
              }
            >
              {!noIsExtreme && (
                <span className="mkt-bar-pct">{noPriceCents}%</span>
              )}
            </span>
          </div>
        </Link>

        <div className="mkt-pills">
          <Link
            href={`/market/${ticker}?side=yes`}
            className="mkt-pill mkt-pill-yes"
            aria-label={`Buy YES at ${yesPriceCents} cents`}
          >
            <span className="mkt-pill-label">YES</span>
            <span className="mkt-pill-price">{yesPriceCents}¢</span>
          </Link>
          <Link
            href={`/market/${ticker}?side=no`}
            className="mkt-pill mkt-pill-no"
            aria-label={`Buy NO at ${noPriceCents} cents`}
          >
            <span className="mkt-pill-label">NO</span>
            <span className="mkt-pill-price">{noPriceCents}¢</span>
          </Link>
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
      .mkt-cat {
        align-self: flex-start;
        color: var(--t2);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.06em;
      }
      .mkt-title {
        font-size: 16px;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.01em;
        color: var(--t1);
        margin: 0;
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
        flex-direction: column;
        gap: 6px;
        padding-top: 2px;
      }
      .mkt-stat-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        font-size: 12px;
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

      .mkt-bar-overlay-out {
        display: flex;
        justify-content: space-between;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        font-variant-numeric: tabular-nums;
        color: var(--t2);
        font-weight: 600;
      }

      .mkt-bar {
        display: flex;
        height: 28px;
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
      .mkt-bar-yes {
        background: var(--yes-bar);
        justify-content: flex-end;
        padding-right: 10px;
      }
      .mkt-bar-no {
        background: var(--no-bar);
        justify-content: flex-start;
        padding-left: 10px;
      }
      .mkt-bar-pct {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.01em;
      }
      .mkt-bar-yes .mkt-bar-pct { color: #1A4830; }
      .mkt-bar-no  .mkt-bar-pct { color: #5C2516; }

      .mkt-pills {
        display: flex;
        gap: 10px;
      }
      .mkt-pill {
        flex: 1 1 0;
        display: inline-flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 14px;
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
    `}</style>
  );
}
