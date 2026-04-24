"use client";

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
  /** Optional category label shown as the eyebrow. Defaults to ticker prefix. */
  categoryLabel?: string;
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
}: MarketCardProps) {
  const timeLeft = formatTimeLeft(closeAt);
  const isSettled = status === "settled";
  const soon = !isSettled && hoursUntil(closeAt) < 48;
  const { yesShare, noShare } = normalizePriceShares(
    yesPriceCents,
    noPriceCents,
  );

  const cat = (categoryLabel || ticker.split("-")[0]).toUpperCase();
  // Cycle the dot color by category so cards don't all look the same.
  const catColor =
    cat.length % 4 === 0
      ? "var(--accent)"
      : cat.length % 4 === 1
        ? "var(--yes)"
        : cat.length % 4 === 2
          ? "var(--whale)"
          : "var(--no)";

  const depthLabel =
    openInterestCents != null
      ? `${formatCompactUsd(openInterestCents)} open interest`
      : liquidityCents != null
        ? `${formatCompactUsd(liquidityCents)} liquidity`
        : statusLabel(status);

  return (
    <>
      <MarketCardStyles />
      <Link
        href={`/market/${ticker}`}
        className="mkt"
        aria-label={`${title}, ${yesPriceCents}¢ yes, ${noPriceCents}¢ no`}
      >
        <div className="mkt-head">
          <span className="mkt-cat">
            <span className="mkt-cat-dot" style={{ background: catColor }} />
            {cat}
          </span>
          {isSettled ? (
            <span className="mkt-chip settled">Settled</span>
          ) : soon ? (
            <span className="mkt-chip soon">{timeLeft}</span>
          ) : (
            <span className="mkt-chip">{timeLeft}</span>
          )}
        </div>

        <h3 className="mkt-title">{title}</h3>

        <div className="mkt-depth">
          <div className="mkt-depth-head">
            <span>Current pricing</span>
            <span className="mono">
              {yesPriceCents} / {noPriceCents}
            </span>
          </div>
          <div className="mkt-depth-bar" aria-hidden>
            <span className="mkt-depth-yes" style={{ width: `${yesShare}%` }} />
            <span className="mkt-depth-no" style={{ width: `${noShare}%` }} />
          </div>
        </div>

        <div className="mkt-mid">
          <div className="mkt-side yes">
            <span className="mkt-side-label">Yes</span>
            <div className="mkt-side-price">
              <strong>{yesPriceCents}¢</strong>
              <span className="mkt-side-hint">Current</span>
            </div>
          </div>
          <div className="mkt-side no">
            <span className="mkt-side-label">No</span>
            <div className="mkt-side-price">
              <strong>{noPriceCents}¢</strong>
              <span className="mkt-side-hint">Current</span>
            </div>
          </div>
        </div>

        <div className="mkt-foot">
          <span>{depthLabel}</span>
          <span className="vol">{formatCompactUsd(volumeCents)} vol</span>
        </div>
      </Link>
    </>
  );
}

/**
 * Styles for MarketCard — rendered as a sibling of the <Link>, not inside it.
 *
 * If we put the <style> tag inside the <Link>, the CSS text becomes part of
 * the link's accessible name (links readers and screen readers see ".mkt {
 * background: var(--s1)..." as link text). Hoisting it as a sibling keeps
 * the link's accessible name clean.
 *
 * The tag duplicates per card render, but browsers de-duplicate identical
 * style content at the parser level, so the cost is negligible. If we ever
 * want a true singleton, lift this into the layout or a CSS module.
 */
function MarketCardStyles() {
  return (
    <style>{`
      .mkt {
        background: var(--s1);
        border: 1px solid var(--b1);
        border-radius: var(--r-md);
        padding: 16px;
        transition: border-color 0.15s, transform 0.15s;
        display: flex;
        flex-direction: column;
        gap: 14px;
        text-decoration: none;
        color: inherit;
      }
      .mkt:hover { border-color: var(--accent); transform: translateY(-2px); }
      .mkt-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }
      .mkt-cat {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .mkt-cat-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .mkt-chip {
        font-size: 10px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 999px;
        background: var(--s2);
        color: var(--t2);
        white-space: nowrap;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .mkt-chip.soon {
        background: rgba(251,191,36,0.14);
        color: var(--whale);
        border: 1px solid rgba(251,191,36,0.3);
      }
      .mkt-chip.settled {
        background: rgba(148,163,184,0.14);
        color: var(--t2);
      }
      .mkt-title {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.35;
        color: var(--t1);
        margin: 0;
      }
      .mkt-depth {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .mkt-depth-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: var(--t3);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .mkt-depth-bar {
        display: flex;
        width: 100%;
        height: 10px;
        overflow: hidden;
        border-radius: 999px;
        background: var(--s2);
        border: 1px solid var(--b1);
      }
      .mkt-depth-yes {
        background: linear-gradient(90deg, rgba(127, 200, 255,0.72), rgba(127, 200, 255,0.92));
      }
      .mkt-depth-no {
        background: linear-gradient(90deg, rgba(255, 155, 107,0.92), rgba(255, 155, 107,0.72));
      }
      .mkt-mid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .mkt-side {
        padding: 10px 12px;
        border-radius: var(--r-sm);
        background: var(--s2);
        border: 1px solid transparent;
        transition: all 0.15s;
      }
      .mkt-side.yes:hover {
        background: rgba(127, 200, 255,0.1);
        border-color: var(--yes);
      }
      .mkt-side.no:hover {
        background: rgba(255, 155, 107,0.1);
        border-color: var(--no);
      }
      .mkt-side-label {
        display: block;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--t3);
        margin-bottom: 2px;
        text-transform: uppercase;
      }
      .mkt-side-price {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 6px;
      }
      .mkt-side-hint {
        font-size: 11px;
        color: var(--t3);
      }
      .mkt-side-price strong {
        font-family: 'IBM Plex Mono', monospace;
        font-variant-numeric: tabular-nums;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .mkt-side.yes strong { color: var(--yes); }
      .mkt-side.no strong { color: var(--no); }
      .mkt-foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: var(--t3);
        padding-top: 10px;
        border-top: 1px solid var(--b1);
      }
      .mkt-foot .vol {
        font-family: 'IBM Plex Mono', monospace;
        font-variant-numeric: tabular-nums;
        color: var(--t2);
        font-weight: 600;
      }
    `}</style>
  );
}

function hoursUntil(closeAt: string): number {
  return (new Date(closeAt).getTime() - Date.now()) / (1000 * 60 * 60);
}

function statusLabel(status: string): string {
  if (status === "open") return "Live market";
  if (status === "closed") return "Trading closed";
  if (status === "settled") return "Market settled";
  return status.replace(/_/g, " ");
}
