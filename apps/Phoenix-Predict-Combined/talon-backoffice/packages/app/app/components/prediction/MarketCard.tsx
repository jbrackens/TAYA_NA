"use client";

/**
 * MarketCard — the prediction-grid card.
 *
 * Matches the approved preview:
 *   [category eyebrow · dot]            [time-left chip]
 *   <title / 15px / 600>
 *   [sparkline — 32px tall]
 *   [YES 41¢ +2¢] [NO 59¢ -2¢]          ← Yes/No split (clickable tiles)
 *   [N traders]                          [$vol]
 *
 * The sparkline is deterministic — derived from the ticker so the same
 * market always shows the same line. When the backend starts exposing
 * historical prices we'll swap this stub for real data.
 */

import Link from "next/link";

interface MarketCardProps {
  ticker: string;
  title: string;
  yesPriceCents: number;
  noPriceCents: number;
  volumeCents: number;
  closeAt: string;
  status: string;
  /** Optional category label shown as the eyebrow. Defaults to ticker prefix. */
  categoryLabel?: string;
  /** Optional trader count — rendered in the footer. Backend doesn't ship this
   * yet so callers can omit it. */
  traders?: number;
}

/** Deterministic placeholder sparkline derived from the ticker string.
 * Replace with real historical data from the prediction_trades table once
 * the API exposes it. Stable seed = stable shape = no jitter across renders. */
function seededSparklinePoints(seed: string, trendingUp: boolean): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const pts: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const x = (i / 20) * 200;
    hash = (hash * 1103515245 + 12345) >>> 0;
    const noise = ((hash >>> 16) % 12) - 6;
    const trend = trendingUp ? 30 - i * 1.2 : 10 + i * 1.2;
    const y = Math.max(4, Math.min(36, trend + noise));
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return pts.join(" ");
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
  traders,
}: MarketCardProps) {
  const timeLeft = getTimeLeft(closeAt);
  const isSettled = status === "settled";
  const soon = !isSettled && hoursUntil(closeAt) < 48;
  const trendingUp = yesPriceCents >= 50;
  const sparkColor = trendingUp ? "var(--yes)" : "var(--no)";
  const points = seededSparklinePoints(ticker, trendingUp);

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

  // Placeholder deltas — +2¢ / -2¢ style. Real deltas come once the
  // backend serves 1h/24h price snapshots.
  const delta = yesPriceCents % 7 === 0 ? 3 : (yesPriceCents % 5) - 2;

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

        <svg className="spark" viewBox="0 0 200 40" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={sparkColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
        </svg>

        <div className="mkt-mid">
          <div className="mkt-side yes">
            <span className="mkt-side-label">Yes</span>
            <div className="mkt-side-price">
              <strong>{yesPriceCents}¢</strong>
              <span
                className={`mkt-delta ${delta > 0 ? "up" : delta < 0 ? "dn" : "flat"}`}
              >
                {delta > 0 ? "+" : ""}
                {delta}¢
              </span>
            </div>
          </div>
          <div className="mkt-side no">
            <span className="mkt-side-label">No</span>
            <div className="mkt-side-price">
              <strong>{noPriceCents}¢</strong>
              <span
                className={`mkt-delta ${delta > 0 ? "dn" : delta < 0 ? "up" : "flat"}`}
              >
                {delta > 0 ? "−" : delta < 0 ? "+" : ""}
                {Math.abs(delta)}¢
              </span>
            </div>
          </div>
        </div>

        <div className="mkt-foot">
          <span>
            {traders != null ? `${traders.toLocaleString()} traders` : "—"}
          </span>
          <span className="vol">${formatCompact(volumeCents)} vol</span>
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
      .spark { height: 32px; width: 100%; opacity: 0.9; }
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
        background: rgba(52,211,153,0.1);
        border-color: var(--yes);
      }
      .mkt-side.no:hover {
        background: rgba(248,113,113,0.1);
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
      .mkt-side-price strong {
        font-family: 'IBM Plex Mono', monospace;
        font-variant-numeric: tabular-nums;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .mkt-side.yes strong { color: var(--yes); }
      .mkt-side.no strong { color: var(--no); }
      .mkt-delta {
        font-size: 11px;
        font-family: 'IBM Plex Mono', monospace;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
      }
      .mkt-delta.up { color: var(--yes); }
      .mkt-delta.dn { color: var(--no); }
      .mkt-delta.flat { color: var(--t3); }
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

function getTimeLeft(closeAt: string): string {
  const diff = new Date(closeAt).getTime() - Date.now();
  if (diff <= 0) return "Closed";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const mins = Math.floor(diff / (1000 * 60));
    return `${mins}m left`;
  }
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

function hoursUntil(closeAt: string): number {
  return (new Date(closeAt).getTime() - Date.now()) / (1000 * 60 * 60);
}

function formatCompact(cents: number): string {
  if (cents >= 1_000_000) return `${(cents / 100_000).toFixed(1)}K`;
  if (cents >= 10_000) return `${(cents / 100).toFixed(0)}`;
  return `${(cents / 100).toFixed(2)}`;
}
