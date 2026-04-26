"use client";

/**
 * MarketCard — Robinhood-direction market tile (P3, see DESIGN.md §7).
 *
 * Shows the market's leading side as a single big price with a sparkline
 * above and a delta pill to the right. The opposing side is implicit
 * (binary contracts: YES + NO = 100¢). Volume sits in a small footer.
 *
 * The prop interface is kept stable so /predict, /category, /discover,
 * and the market-detail "related markets" rail keep compiling.
 *
 * Color discipline (DESIGN.md §3 strict two-greens):
 *   - mint --accent: category pill (action-adjacent), brand
 *   - seafoam --yes: up-direction (sparkline up, delta-up pill,
 *     YES-leading price color)
 *   - coral --no: down-direction (NO-leading price color, down delta)
 */

import Link from "next/link";
import { formatCompactUsd, formatTimeLeft } from "./market-display";
import { deterministicDelta, sparklinePath } from "./utils/spark";

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

function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60);
}

export function MarketCard({
  ticker,
  title,
  yesPriceCents,
  noPriceCents,
  volumeCents,
  closeAt,
  status,
  categoryLabel,
  // openInterestCents, liquidityCents, imagePath: kept on the prop interface
  // for caller stability; not rendered in the Robinhood-direction card.
}: MarketCardProps) {
  const isSettled = status === "settled";
  const timeLeft = isSettled ? "Settled" : formatTimeLeft(closeAt);
  const soon = !isSettled && hoursUntil(closeAt) < 48;

  const yesLeads = yesPriceCents >= noPriceCents;
  const leadingPrice = yesLeads ? yesPriceCents : noPriceCents;
  const leadingSide = yesLeads ? "YES" : "NO";

  const { pct, up } = deterministicDelta(ticker, leadingPrice);
  const sparkColor = up ? "var(--yes)" : "var(--no)";
  const sparkD = sparklinePath(ticker, leadingPrice, up, 240, 36);

  const cat = (categoryLabel || ticker.split("-")[0]).toUpperCase();

  return (
    <>
      <MarketCardStyles />
      <Link
        href={`/market/${ticker}`}
        className="mkt"
        aria-label={`${title}, ${leadingSide} ${leadingPrice} cents, ${up ? "+" : ""}${pct.toFixed(1)}%`}
      >
        <div className="mkt-head">
          <span className="mkt-cat">{cat}</span>
          <span
            className={`mkt-chip ${soon ? "soon" : isSettled ? "settled" : ""}`}
          >
            {timeLeft}
          </span>
        </div>

        <h3 className="mkt-title">{title}</h3>

        <span className="mkt-spark" aria-hidden="true">
          <svg viewBox="0 0 240 36" preserveAspectRatio="none">
            <path
              d={sparkD}
              stroke={sparkColor}
              strokeWidth="1.8"
              fill="none"
            />
          </svg>
        </span>

        <div className="mkt-row">
          <span className={`mkt-px ${yesLeads ? "yes" : "no"}`}>
            <span className="lbl">{leadingSide}</span>
            {leadingPrice}¢
          </span>
          <span className={`mkt-delta ${up ? "up" : "down"}`}>
            {up ? "+" : ""}
            {pct.toFixed(1)}%
          </span>
        </div>

        <div className="mkt-foot">{formatCompactUsd(volumeCents)} vol</div>
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
        gap: 12px;
        padding: 22px;
        background: var(--surface-1);
        border: 1px solid var(--border-1);
        border-radius: var(--r-rh-lg);
        text-decoration: none;
        color: var(--t1);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        transition: background 120ms ease, transform 120ms ease, border-color 120ms ease;
      }
      .mkt:hover {
        background: var(--surface-2);
        transform: translateY(-2px);
      }
      .mkt:focus-visible {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent-soft);
      }

      .mkt-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .mkt-cat {
        color: var(--accent);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
        padding: 4px 10px;
        border-radius: var(--r-pill);
        background: var(--accent-soft);
      }
      .mkt-chip {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 11px;
        color: var(--t3);
        padding: 4px 0;
        font-variant-numeric: tabular-nums;
      }
      .mkt-chip.soon { color: var(--live); }
      .mkt-chip.settled { color: var(--t3); }

      .mkt-title {
        font-size: 16px;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.01em;
        color: var(--t1);
        margin: 0;
        min-height: 42px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .mkt-spark {
        display: block;
        width: 100%;
        height: 36px;
      }
      .mkt-spark svg { width: 100%; height: 100%; display: block; }

      .mkt-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        padding-top: 4px;
      }
      .mkt-px {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 26px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
        color: var(--t1);
        line-height: 1;
      }
      .mkt-px.yes { color: var(--t1); }
      .mkt-px.no  { color: var(--t1); }
      .mkt-px .lbl {
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.04em;
        color: var(--t3);
        margin-right: 8px;
        text-transform: uppercase;
      }
      .mkt-delta {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        padding: 4px 10px;
        border-radius: var(--r-pill);
      }
      .mkt-delta.up { background: var(--yes-soft); color: var(--yes); }
      .mkt-delta.down { background: var(--no-soft); color: var(--no); }

      .mkt-foot {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 11px;
        color: var(--t3);
        font-variant-numeric: tabular-nums;
      }
    `}</style>
  );
}
