"use client";

/**
 * MarketCard — Liquid Glass market tile used on /predict, /category,
 * and the market-detail "related markets" rail.
 *
 * Renders a glass panel with: category pill + close-in pill, the market
 * question, a current-pricing depth bar (seafoam YES / coral NO), and
 * YES/NO side-price stats. Keeps the prop interface from the prior
 * dark-broadcast version so /predict + /category keep compiling until
 * Phase 4 upgrades those pages.
 *
 * MarketCardStyles is hoisted as a sibling of the <Link> so the CSS
 * text doesn't bleed into the link's accessible name (regression fix,
 * see Bug D in app/__tests__/qa-regressions-2026-04-18.test.ts).
 */

import Link from "next/link";
import {
  formatCompactUsd,
  formatTimeLeft,
  normalizePriceShares,
} from "./market-display";

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

function statusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Live";
    case "halted":
      return "Halted";
    case "closed":
      return "Closed";
    case "settled":
      return "Settled";
    case "voided":
      return "Voided";
    default:
      return status;
  }
}

export function MarketCard({
  ticker,
  title,
  yesPriceCents,
  noPriceCents,
  volumeCents,
  openInterestCents,
  liquidityCents,
  closeAt,
  status,
  categoryLabel,
  // imagePath: intentionally not destructured. Prop kept on the interface
  // (parents still pass it) for the future render path documented in JSX.
}: MarketCardProps) {
  const timeLeft = formatTimeLeft(closeAt);
  const isSettled = status === "settled";
  const soon = !isSettled && hoursUntil(closeAt) < 48;
  const { yesShare, noShare } = normalizePriceShares(
    yesPriceCents,
    noPriceCents,
  );

  const cat = (categoryLabel || ticker.split("-")[0]).toUpperCase();
  const depthLabel =
    openInterestCents != null
      ? `${formatCompactUsd(openInterestCents)} OI`
      : liquidityCents != null
        ? `${formatCompactUsd(liquidityCents)} liq`
        : statusLabel(status);

  return (
    <>
      <MarketCardStyles />
      <Link
        href={`/market/${ticker}`}
        className="mkt glass"
        aria-label={`${title}, ${yesPriceCents}¢ yes, ${noPriceCents}¢ no`}
      >
        <div className="mkt-head">
          <span className="mkt-cat">{cat}</span>
          {isSettled ? (
            <span className="mkt-chip settled">Settled</span>
          ) : (
            <span className={`mkt-chip ${soon ? "soon" : ""}`}>{timeLeft}</span>
          )}
        </div>

        {/* Image rendering intentionally disabled. Mixed image / no-image
            cards produced 2.1x height variance across rows, breaking the
            grid rhythm. The `imagePath` prop is preserved for the future
            (detail page hero, share cards, etc.). To re-enable cards with
            a forced uniform aspect, restore the <img> here AND set every
            promoted market to have an image (currently only ~30% do). */}

        <h3 className="mkt-title">{title}</h3>

        <div className="mkt-bar" aria-hidden>
          <span className="mkt-bar-yes" style={{ width: `${yesShare}%` }} />
          <span className="mkt-bar-no" style={{ width: `${noShare}%` }} />
        </div>

        <div className="mkt-sides">
          <div className="mkt-side yes">
            <span className="mkt-side-label">YES</span>
            <span className="mkt-side-price">{yesPriceCents}¢</span>
          </div>
          <div className="mkt-side no">
            <span className="mkt-side-label">NO</span>
            <span className="mkt-side-price">{noPriceCents}¢</span>
          </div>
        </div>

        <div className="mkt-foot">
          <span>{depthLabel}</span>
          <span className="mkt-vol">{formatCompactUsd(volumeCents)} vol</span>
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
        gap: 10px;
        padding: 16px 16px 14px;
        border-radius: var(--r-md);
        text-decoration: none;
        color: var(--t1);
        transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
      }
      .mkt:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.22);
      }
      .mkt:focus-visible {
        outline: none;
        border-color: var(--accent);
        box-shadow:
          inset 0 1px 0 var(--rim-top),
          0 0 0 2px var(--accent-soft),
          0 10px 28px rgba(0, 0, 0, 0.22);
      }

      .mkt-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .mkt-cat {
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: var(--r-pill);
        background: rgba(43, 228, 128, 0.08);
        border: 1px solid rgba(43, 228, 128, 0.22);
        box-shadow:
          inset 0 1px 0 rgba(43, 228, 128, 0.22),
          0 0 16px rgba(43, 228, 128, 0.08);
      }
      .mkt-chip {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 11px;
        color: var(--t2);
        padding: 4px 10px;
        border-radius: var(--r-pill);
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-variant-numeric: tabular-nums;
      }
      .mkt-chip.soon {
        color: var(--live);
        background: rgba(255, 107, 107, 0.1);
        border-color: rgba(255, 107, 107, 0.22);
      }
      .mkt-chip.settled {
        color: var(--t3);
        background: rgba(255, 255, 255, 0.04);
      }

      .mkt-title {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.01em;
        color: var(--t1);
        margin: 0;
        min-height: 36px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .mkt-bar {
        position: relative;
        display: flex;
        height: 4px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.35);
      }
      .mkt-bar-yes {
        background: linear-gradient(90deg, var(--yes-lo), var(--yes));
        box-shadow: 0 0 8px var(--yes-glow);
      }
      .mkt-bar-no {
        background: linear-gradient(90deg, var(--no), var(--no-lo));
      }

      .mkt-sides {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .mkt-side {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        padding: 8px 10px;
        border-radius: var(--r-sm);
        background: rgba(0, 0, 0, 0.22);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
      .mkt-side-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .mkt-side.yes .mkt-side-label { color: var(--yes); }
      .mkt-side.no  .mkt-side-label { color: var(--no); }
      .mkt-side-price {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 18px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.01em;
      }
      .mkt-side.yes .mkt-side-price { color: var(--yes); }
      .mkt-side.no  .mkt-side-price { color: var(--no); }

      .mkt-foot {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 11px;
        color: var(--t3);
        font-variant-numeric: tabular-nums;
        padding-top: 2px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }
      .mkt-vol { color: var(--t2); }
    `}</style>
  );
}
