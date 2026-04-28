"use client";

/**
 * MarketCard — P8 light-pivot composition (see DESIGN.md §7 "MarketCard composition (P8)").
 *
 * Replaces the dark-theme P3 card (sparkline + dual mono prices + delta pill).
 * New layout:
 *   - eyebrow (category pill) + corner circular image (≤15% card area)
 *   - title (2-line clamped)
 *   - 3 stat rows: Volume / Closes / Open interest
 *   - probability bar (yes-bar + no-bar segments, widths = prices)
 *   - two clear pills below: YES ¢ / NO ¢ using --yes-text / --no-text
 *
 * The probability bar segment overlay text uses component-local constants:
 *   YES segment: #1A4830 on --yes-bar #8FE5C4 ≈ 7.0:1 (AA)
 *   NO segment:  #5C2516 on --no-bar  #F4A990 ≈ 6.3:1 (AA)
 * These are intentionally not promoted to tokens per DESIGN.md §6.
 *
 * Min-segment rule: when a side's price ≤5¢ the segment renders at a
 * min-width of 12px (not proportional) and the overlaid % moves outside
 * the bar, rendered in --t2 / 12px IBM Plex Mono just above the segment.
 *
 * Color discipline (DESIGN.md §3):
 *   --yes-text #1A6849: YES pill label + price (AA on white / cream)
 *   --no-text  #A8472D: NO pill label + price (AA on white / cream)
 *   --yes-bar  #8FE5C4: YES probability-bar segment fill
 *   --no-bar   #F4A990: NO probability-bar segment fill
 */

import Link from "next/link";
import { BarChart2, Calendar, Clock } from "lucide-react";
import { formatCompactUsd, formatTimeLeft } from "./market-display";
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

/* Component-local bar overlay text colors (intentionally NOT tokens per spec). */
const YES_BAR_TEXT = "#1A4830"; /* ≈7.0:1 on --yes-bar #8FE5C4 */
const NO_BAR_TEXT  = "#5C2516"; /* ≈6.3:1 on --no-bar  #F4A990 */
const MIN_SEG_PX   = 12; /* minimum bar segment width in px */

function formatCloseAt(iso: string, status: string): string {
  if (status === "settled") return "Settled";
  if (status === "voided") return "Voided";
  return formatTimeLeft(iso);
}

function oiSummary(openInterestCents: number | undefined, yesPriceCents: number, noPriceCents: number): string {
  if (!openInterestCents) return "—";
  const dollars = openInterestCents / 100;
  let label = "";
  if (dollars >= 1_000_000) label = `$${(dollars / 1_000_000).toFixed(1)}M`;
  else if (dollars >= 1_000) label = `$${(dollars / 1_000).toFixed(1)}K`;
  else label = `$${dollars.toFixed(0)}`;
  const leading = yesPriceCents >= noPriceCents ? "YES" : "NO";
  return `${label} ${leading}`;
}

export function MarketCard({
  ticker,
  title,
  yesPriceCents,
  noPriceCents,
  volumeCents,
  openInterestCents,
  closeAt,
  status,
  categoryLabel,
  imagePath,
}: MarketCardProps) {
  const cat = (categoryLabel || ticker.split("-")[0]).toUpperCase();
  const imageProps = getMarketImageProps({ ticker, imagePath, categoryLabel });

  const yes = Math.max(0, Math.min(100, yesPriceCents));
  const no  = Math.max(0, Math.min(100, noPriceCents));

  /* Min-segment rule: ≤5¢ → render at 12px, move label outside bar */
  const yesExtreme = yes <= 5;
  const noExtreme  = no  <= 5;
  const yesWidthStyle: React.CSSProperties = yesExtreme
    ? { minWidth: `${MIN_SEG_PX}px`, width: `${MIN_SEG_PX}px`, flex: "none" }
    : noExtreme
    ? { flex: 1 } /* absorb space when NO is at min */
    : { width: `${yes}%` };
  const noWidthStyle: React.CSSProperties = noExtreme
    ? { minWidth: `${MIN_SEG_PX}px`, width: `${MIN_SEG_PX}px`, flex: "none" }
    : yesExtreme
    ? { flex: 1 } /* absorb space when YES is at min */
    : { width: `${no}%` };

  return (
    <>
      <MarketCardStyles />
      <Link
        href={`/market/${ticker}`}
        className="mkt"
        aria-label={`${title}, YES ${yesPriceCents} cents, NO ${noPriceCents} cents`}
      >
        {/* Head: eyebrow + corner image */}
        <div className="mkt-head">
          <div className="mkt-head-left">
            <span className="mkt-cat">{cat}</span>
            <h3 className="mkt-title">{title}</h3>
          </div>
          {"src" in imageProps ? (
            <img
              src={imageProps.src}
              alt=""
              aria-hidden="true"
              className="mkt-img"
            />
          ) : (
            <span className={`mkt-img mkt-monogram ${imageProps.bgClass}`}>
              {imageProps.monogram}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="mkt-stats">
          <div className="mkt-stat-row">
            <BarChart2 size={14} aria-hidden="true" />
            <span className="mkt-stat-label">Volume</span>
            <span className="mkt-stat-value">{formatCompactUsd(volumeCents)}</span>
          </div>
          <div className="mkt-stat-row">
            <Calendar size={14} aria-hidden="true" />
            <span className="mkt-stat-label">Closes</span>
            <span className="mkt-stat-value">{formatCloseAt(closeAt, status)}</span>
          </div>
          <div className="mkt-stat-row">
            <Clock size={14} aria-hidden="true" />
            <span className="mkt-stat-label">Open interest</span>
            <span className="mkt-stat-value">{oiSummary(openInterestCents, yes, no)}</span>
          </div>
        </div>

        {/* Probability bar */}
        <div className="mkt-bar-wrap">
          {/* Outside label for extreme YES (≤5¢) */}
          {yesExtreme && (
            <span
              className="mkt-bar-ext-label"
              style={{ left: 0 }}
              aria-hidden="true"
            >
              {yes}%
            </span>
          )}
          {/* Outside label for extreme NO (≤5¢) */}
          {noExtreme && (
            <span
              className="mkt-bar-ext-label"
              style={{ right: 0 }}
              aria-hidden="true"
            >
              {no}%
            </span>
          )}
          <div className="mkt-bar">
            <span
              className="mkt-bar-yes"
              style={yesWidthStyle}
              aria-hidden="true"
            >
              {!yesExtreme && `${yes}%`}
            </span>
            <span
              className="mkt-bar-no"
              style={noWidthStyle}
              aria-hidden="true"
            >
              {!noExtreme && `${no}%`}
            </span>
          </div>
        </div>

        {/* Pills */}
        <div className="mkt-pills">
          <span className="mkt-pill yes">
            <span className="mkt-pill-label">YES</span>
            <span className="mkt-pill-price">{yesPriceCents}¢</span>
          </span>
          <span className="mkt-pill no">
            <span className="mkt-pill-label">NO</span>
            <span className="mkt-pill-price">{noPriceCents}¢</span>
          </span>
        </div>
      </Link>
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
        text-decoration: none;
        color: var(--t1);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
      }
      .mkt:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(60, 50, 30, 0.08);
        border-color: var(--border-2);
      }
      .mkt:focus-visible {
        outline: 2px solid #0E7A53;
        outline-offset: 2px;
      }

      /* Head row */
      .mkt-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .mkt-head-left {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .mkt-cat {
        color: var(--t3);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
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

      /* Corner image / monogram */
      .mkt-img {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        flex-shrink: 0;
        object-fit: cover;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        letter-spacing: 0.02em;
      }
      .mkt-monogram {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .mkt-monogram.cat-blue    { background: #3b82f6; }
      .mkt-monogram.cat-orange  { background: #f97316; }
      .mkt-monogram.cat-soccer  { background: #16a34a; }
      .mkt-monogram.cat-purple  { background: #a855f7; }
      .mkt-monogram.cat-green   { background: #059669; }
      .mkt-monogram.cat-slate   { background: #64748b; }

      /* Stat rows */
      .mkt-stats {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .mkt-stat-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--t3);
      }
      .mkt-stat-row svg { flex-shrink: 0; color: var(--t4); }
      .mkt-stat-label { flex: 1; }
      .mkt-stat-value {
        font-family: 'IBM Plex Mono', monospace;
        font-variant-numeric: tabular-nums;
        color: var(--t1);
        font-size: 12px;
        font-weight: 600;
      }

      /* Probability bar */
      .mkt-bar-wrap {
        position: relative;
      }
      .mkt-bar-ext-label {
        position: absolute;
        top: -16px;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        color: var(--t2);
        font-variant-numeric: tabular-nums;
      }
      .mkt-bar {
        display: flex;
        height: 28px;
        border-radius: 6px;
        overflow: hidden;
        width: 100%;
      }
      .mkt-bar-yes {
        background: var(--yes-bar);
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 0 6px;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: ${YES_BAR_TEXT};
        white-space: nowrap;
        overflow: hidden;
        transition: width 200ms ease;
      }
      .mkt-bar-no {
        background: var(--no-bar);
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 0 6px;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: ${NO_BAR_TEXT};
        white-space: nowrap;
        overflow: hidden;
        transition: width 200ms ease;
      }

      /* Pills */
      .mkt-pills {
        display: flex;
        gap: 8px;
      }
      .mkt-pill {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        padding: 8px 12px;
        background: var(--surface-2);
        border: 1px solid var(--border-1);
        border-radius: 999px;
      }
      .mkt-pill-label {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
      }
      .mkt-pill-price {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 13px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .mkt-pill.yes .mkt-pill-label,
      .mkt-pill.yes .mkt-pill-price { color: var(--yes-text); }
      .mkt-pill.no .mkt-pill-label,
      .mkt-pill.no .mkt-pill-price  { color: var(--no-text); }
    `}</style>
  );
}
