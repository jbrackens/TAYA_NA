"use client";

/**
 * TrendingSidebar — "Top Movers" rail next to the DiscoveryHero on /predict.
 *
 * Visual identity changed 2026-04-26 (Robinhood direction, see DESIGN.md
 * §7). Borderless flat list, mini sparkline + big price + delta pill per
 * row. The component file name stays as `TrendingSidebar` for import
 * stability while the visual identity is now "Top Movers."
 *
 * Reuses `discovery.trending` data; each row links to /market/[ticker].
 * Sparklines and 24h delta are deterministic from the ticker (placeholder
 * until backend exposes price history).
 *
 * Color discipline (DESIGN.md §3 strict two-greens):
 *   - mint --accent: actions/brand only (the live dot in the header)
 *   - seafoam --yes: up-direction (sparkline up, delta-up pill)
 *   - coral --no: down-direction
 */

import Link from "next/link";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import { deterministicDelta, sparklinePath } from "./utils/spark";

interface Props {
  markets: PredictionMarket[];
  /** Maximum rows to render. Default 6 (matches Top Movers height to hero). */
  limit?: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  pol: "Politics",
  pres: "Politics",
  senate: "Senate",
  house: "Politics",
  fed: "Fed",
  fomc: "Fed",
  btc: "Crypto",
  eth: "Crypto",
  crypto: "Crypto",
  nba: "Sports",
  nfl: "Sports",
  ucl: "Sports",
  spx: "Tech",
  aapl: "Tech",
  gpt: "Tech",
};

function categoryFromTicker(ticker: string): string {
  const prefix = ticker.split("-")[0]?.toLowerCase() ?? "";
  return CATEGORY_LABEL[prefix] ?? prefix.toUpperCase();
}

export function TrendingSidebar({ markets, limit = 6 }: Props) {
  if (!markets || markets.length === 0) return null;
  const rows = markets.slice(0, limit);

  return (
    <>
      <style>{`
        .tm {
          padding: 8px 4px 4px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .tm-h {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px;
          padding: 0 8px;
        }
        .tm-h h3 {
          font-size: 18px; font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--t1);
          margin: 0;
        }
        .tm-h .live {
          display: inline-flex; gap: 6px; align-items: center;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--accent);
        }
        .tm-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px rgba(43, 228, 128, 0.6);
          animation: tm-pulse 2.2s ease-in-out infinite;
        }
        @keyframes tm-pulse { 50% { opacity: 0.45; } }

        .tm-list { list-style: none; margin: 0; padding: 0; }
        .tm-row {
          display: grid;
          grid-template-columns: 1fr 60px auto;
          gap: 14px;
          align-items: center;
          padding: 14px 8px;
          border-bottom: 1px solid var(--border-1);
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          transition: background 120ms ease;
          border-radius: var(--r-rh-sm);
        }
        .tm-row:hover { background: var(--surface-2); }
        .tm-row:last-child { border-bottom: 0; }
        .tm-info { min-width: 0; }
        .tm-cat {
          font-size: 11px; font-weight: 500;
          color: var(--accent);
          margin-bottom: 4px;
        }
        .tm-q {
          font-size: 13px; font-weight: 500;
          color: var(--t1);
          line-height: 1.3;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .tm-spark { width: 60px; height: 28px; }
        .tm-spark svg { width: 100%; height: 100%; display: block; }
        .tm-meta { text-align: right; min-width: 56px; }
        .tm-px {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 15px; font-weight: 600;
          color: var(--t1);
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .tm-delta {
          display: inline-block;
          margin-top: 5px;
          padding: 2px 7px;
          border-radius: var(--r-pill);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .tm-delta.up { background: var(--yes-soft); color: var(--yes); }
        .tm-delta.down { background: var(--no-soft); color: var(--no); }

        .tm-foot {
          margin-top: 14px;
          padding: 10px 8px 0;
          border-top: 1px solid var(--border-1);
          text-align: center;
        }
        .tm-foot a {
          font-size: 13px; font-weight: 600;
          color: var(--accent);
          text-decoration: none;
        }
        .tm-foot a:hover { text-decoration: underline; }
      `}</style>
      <aside className="tm" aria-label="Top movers">
        <div className="tm-h">
          <h3>Top movers</h3>
          <span className="live">
            <span className="tm-dot" aria-hidden="true" />
            24H
          </span>
        </div>
        <ul className="tm-list">
          {rows.map((m) => {
            const yesLeads = m.yesPriceCents >= m.noPriceCents;
            const leadingPrice = yesLeads ? m.yesPriceCents : m.noPriceCents;
            const { pct, up } = deterministicDelta(m.ticker, leadingPrice);
            const sparkColor = up ? "var(--yes)" : "var(--no)";
            const cat = categoryFromTicker(m.ticker);
            return (
              <li key={m.id}>
                <Link
                  href={`/market/${m.ticker}`}
                  className="tm-row"
                  aria-label={`${m.title}, ${leadingPrice} cents, ${up ? "+" : ""}${pct.toFixed(1)}%`}
                >
                  <div className="tm-info">
                    <div className="tm-cat">{cat}</div>
                    <div className="tm-q">{m.title}</div>
                  </div>
                  <span className="tm-spark" aria-hidden="true">
                    <svg viewBox="0 0 60 28" preserveAspectRatio="none">
                      <path
                        d={sparklinePath(m.ticker, leadingPrice, up)}
                        stroke={sparkColor}
                        strokeWidth="1.5"
                        fill="none"
                      />
                    </svg>
                  </span>
                  <div className="tm-meta">
                    <div className="tm-px">{leadingPrice}¢</div>
                    <span className={`tm-delta ${up ? "up" : "down"}`}>
                      {up ? "+" : ""}
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="tm-foot">
          <a href="/discover">View all trending →</a>
        </div>
      </aside>
    </>
  );
}
