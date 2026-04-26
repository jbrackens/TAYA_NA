"use client";

/**
 * TrendingSidebar — ranked list of trending markets that sits to the right
 * of the DiscoveryHero on /predict (Polymarket-style "Hot topics").
 *
 * Reuses `discovery.trending` data already loaded by the discovery API,
 * so no new endpoint is needed. Each row links to the market detail page.
 *
 * On viewports ≤960px the parent grid collapses; the sidebar drops below
 * the hero (handled by .hero-row in predict/page.tsx).
 */

import Link from "next/link";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";

interface Props {
  markets: PredictionMarket[];
  /** Maximum rows to render. Default 7. */
  limit?: number;
}

function formatVolume(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

export function TrendingSidebar({ markets, limit = 7 }: Props) {
  if (!markets || markets.length === 0) return null;
  const rows = markets.slice(0, limit);

  return (
    <>
      <style>{`
        .ts {
          padding: 18px 16px 14px;
          display: flex;
          flex-direction: column;
          border-radius: var(--r-lg);
        }
        .ts-head {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 4px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .ts-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent-glow-color);
          animation: ts-pulse 2.2s ease-in-out infinite;
        }
        @keyframes ts-pulse { 50% { opacity: 0.45; transform: scale(0.92); } }
        .ts-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--t3);
          flex: 1;
        }
        .ts-eyebrow strong { color: var(--t1); }
        .ts-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
        }
        .ts-row {
          display: grid;
          grid-template-columns: 18px 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 8px 6px;
          border-radius: var(--r-sm);
          cursor: pointer;
          transition: background 120ms ease;
          text-decoration: none;
          color: inherit;
        }
        .ts-row:hover { background: rgba(255, 255, 255, 0.04); }
        .ts-row + .ts-row { border-top: 1px solid rgba(255, 255, 255, 0.04); }
        .ts-rank {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--t4);
          font-variant-numeric: tabular-nums;
          text-align: center;
        }
        .ts-title {
          font-size: 13px;
          font-weight: 600;
          line-height: 1.3;
          color: var(--t1);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .ts-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .ts-price {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
        }
        .ts-price.yes { color: var(--yes); }
        .ts-price.no { color: var(--no); }
        .ts-vol {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: var(--t3);
          font-variant-numeric: tabular-nums;
        }
        .ts-foot {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          text-align: center;
        }
        .ts-foot a {
          color: var(--accent);
          font-size: 12px;
          text-decoration: none;
          text-shadow: 0 0 6px var(--accent-glow-color);
        }
        .ts-foot a:hover { text-decoration: underline; }
      `}</style>
      <aside className="glass ts" aria-label="Trending markets">
        <div className="ts-head">
          <span className="ts-dot" aria-hidden="true" />
          <span className="ts-eyebrow">
            <strong>TRENDING</strong> NOW · 24H
          </span>
        </div>
        <ul className="ts-list">
          {rows.map((m, i) => {
            const yesLeads = m.yesPriceCents >= m.noPriceCents;
            const leadingPriceClass = yesLeads ? "yes" : "no";
            const leadingPrice = yesLeads ? m.yesPriceCents : m.noPriceCents;
            const leadingLabel = yesLeads ? "YES" : "NO";
            return (
              <li key={m.id}>
                <Link
                  href={`/market/${m.ticker}`}
                  className="ts-row"
                  aria-label={`${m.title}, ${leadingPrice}¢ ${leadingLabel}, volume ${formatVolume(m.volumeCents)}`}
                >
                  <span className="ts-rank">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="ts-title">{m.title}</span>
                  <span className="ts-meta">
                    <span className={`ts-price ${leadingPriceClass}`}>
                      {leadingPrice}¢
                    </span>
                    <span className="ts-vol">
                      {formatVolume(m.volumeCents)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ts-foot">
          <a href="/discover">View all trending →</a>
        </div>
      </aside>
    </>
  );
}
