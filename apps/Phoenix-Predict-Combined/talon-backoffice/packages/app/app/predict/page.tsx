"use client";

/**
 * PredictDiscoveryPage — the prediction homepage, Liquid Glass edition.
 *
 * Structure:
 *   [Hero row]          ← DiscoveryHero (1fr) + TrendingSidebar (320px)
 *   [Featured grid]     ← curated highlights (always visible)
 *   [MarketFilterBar]   ← pill segmented time filter + topic dropdown
 *   [All Markets grid]  ← paginated full market list, scoped by the filter
 *
 * The pills sit directly above the section they scope. Hero, sidebar,
 * and Featured stay visible at all filter states.
 *
 * Trending and Closing Soon grids moved to /discover.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MarketFilterBar,
  EMPTY_FILTER,
  isFilterActive,
  type MarketFilterValue,
} from "../components/prediction/MarketFilterBar";
import { TrendingSidebar } from "../components/prediction/TrendingSidebar";
import { AllMarketsSection } from "../components/prediction/AllMarketsSection";
import { SectionHead } from "../components/prediction/SectionHead";
import { MarketGrid } from "../components/prediction/MarketGrid";
import type {
  Category,
  DiscoveryResponse,
  PredictionMarket,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import {
  deterministicDelta,
  heroChartPath,
} from "../components/prediction/utils/spark";

const api = createPredictionClient();

// CategoryChips removed in favor of MarketFilterBar (see ../components/
// prediction/MarketFilterBar.tsx). The chips navigated to /category/[slug];
// the new bar filters in-place on this page. /category routes still work
// for direct links and external navigation.

function formatHeroVolume(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

function formatHeroCloseLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const days = ms / 86_400_000;
  if (days >= 1) return `${Math.floor(days)}d`;
  const hours = ms / 3_600_000;
  if (hours >= 1) return `${Math.floor(hours)}h`;
  const mins = ms / 60_000;
  return `${Math.max(1, Math.floor(mins))}m`;
}

const HERO_PERIODS = ["1H", "1D", "1W", "1M", "3M", "ALL"] as const;

function DiscoveryHero({
  market,
  categoryName,
}: {
  market: PredictionMarket | null;
  categoryName?: string;
}) {
  if (!market) {
    return (
      <section
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-rh-lg)",
          padding: 36,
          minHeight: 480,
          color: "var(--t3)",
        }}
      >
        Loading a featured market…
      </section>
    );
  }

  const yes = market.yesPriceCents;
  const no = market.noPriceCents;
  const { delta, pct } = deterministicDelta(market.ticker, yes);
  const isUp = delta >= 0;
  const chart = heroChartPath(market.ticker, yes);
  const volumeLabel = formatHeroVolume(market.volumeCents);
  const oiLabel =
    market.openInterestCents != null
      ? formatHeroVolume(market.openInterestCents)
      : "—";
  const closesLabel = formatHeroCloseLeft(market.closeAt);

  return (
    <>
      <style>{`
        .rh-hero {
          background: var(--surface-1);
          border: 1px solid var(--border-1);
          border-radius: var(--r-rh-lg);
          padding: 36px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .rh-hero-eyebrow {
          display: flex; align-items: center; gap: 10px;
          font-size: 12px; font-weight: 500;
          color: var(--t3);
          margin-bottom: 14px;
        }
        .rh-hero-eyebrow .live {
          display: inline-flex; gap: 6px; align-items: center;
          color: var(--accent); font-weight: 600;
          letter-spacing: 0.08em;
        }
        .rh-hero-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 0 4px rgba(43, 228, 128, 0.18);
          animation: rh-pulse 2s ease-in-out infinite;
        }
        @keyframes rh-pulse { 50% { opacity: 0.55; } }
        .rh-hero-q {
          font-family: 'Inter', sans-serif;
          font-size: 28px; font-weight: 600;
          line-height: 1.2; letter-spacing: -0.02em;
          margin: 0 0 24px;
          color: var(--t1);
          max-width: 720px;
        }
        .rh-bigprice {
          font-family: 'Inter Tight', 'Inter', sans-serif;
          font-size: 88px; font-weight: 600;
          line-height: 1; letter-spacing: -0.04em;
          font-variant-numeric: tabular-nums;
          color: var(--t1);
          margin: 0 0 12px;
        }
        .rh-bigprice .cents {
          font-size: 56px; color: var(--t3); font-weight: 500;
          margin-left: 4px;
        }
        .rh-change {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 17px; font-weight: 600;
          font-variant-numeric: tabular-nums;
          margin-bottom: 28px;
        }
        .rh-change.up    { color: var(--yes); }
        .rh-change.down  { color: var(--no); }
        .rh-change .arrow {
          display: inline-block;
          width: 0; height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
        }
        .rh-change.up   .arrow { border-bottom: 7px solid var(--yes); }
        .rh-change.down .arrow { border-top:    7px solid var(--no); }
        .rh-change .label {
          color: var(--t3); font-weight: 500; font-size: 14px;
        }

        .rh-chart { margin-bottom: 16px; }
        .rh-chart svg { width: 100%; height: 220px; display: block; }
        .rh-periods {
          display: flex; gap: 4px;
          margin-top: 14px;
        }
        .rh-period {
          padding: 6px 14px;
          border-radius: var(--r-pill);
          background: transparent;
          color: var(--t3);
          font-size: 12px; font-weight: 600;
          font-family: inherit;
          border: 0; cursor: pointer;
        }
        .rh-period:hover { color: var(--t1); }
        .rh-period.is-active {
          background: var(--accent-soft);
          color: var(--accent);
        }

        .rh-actions {
          display: flex; gap: 12px;
          margin-top: 28px;
        }
        .rh-buy-yes, .rh-buy-no {
          flex: 1; max-width: 280px;
          display: inline-flex; align-items: center; justify-content: center;
          font-family: inherit;
          font-weight: 600; font-size: 15px;
          padding: 16px 24px;
          border: 0; border-radius: var(--r-pill);
          cursor: pointer; text-decoration: none;
          font-variant-numeric: tabular-nums;
          transition: filter 120ms ease, background 120ms ease, transform 120ms ease;
        }
        .rh-buy-yes {
          background: var(--accent);
          color: #061a10;
        }
        .rh-buy-yes:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .rh-buy-no {
          background: var(--no-soft);
          color: var(--no);
        }
        .rh-buy-no:hover { background: rgba(255, 139, 107, 0.22); }

        .rh-stats {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--border-1);
        }
        .rh-stat-label {
          font-size: 12px; color: var(--t3);
          margin-bottom: 6px;
        }
        .rh-stat-value {
          font-size: 18px; font-weight: 600;
          color: var(--t1);
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 720px) {
          .rh-hero { padding: 24px; }
          .rh-bigprice { font-size: 64px; }
          .rh-bigprice .cents { font-size: 40px; }
          .rh-hero-q { font-size: 22px; }
          .rh-stats { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
      `}</style>
      <section className="rh-hero" aria-label="Featured market">
        <header className="rh-hero-eyebrow">
          {market.status === "open" && (
            <>
              <span className="live">
                <span className="rh-hero-dot" aria-hidden="true" />
                LIVE
              </span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>
            {categoryName ? `${categoryName.toUpperCase()} · ` : ""}
            {market.ticker}
          </span>
        </header>

        <h1 className="rh-hero-q">{market.title}</h1>

        <div className="rh-bigprice" aria-label={`Yes price ${yes} cents`}>
          {yes}
          <span className="cents">¢</span>
        </div>
        <div className={`rh-change ${isUp ? "up" : "down"}`}>
          <span className="arrow" aria-hidden="true" />
          {isUp ? "+" : ""}
          {delta}¢ ({isUp ? "+" : ""}
          {pct.toFixed(1)}%)
          <span className="label">Today</span>
        </div>

        <div className="rh-chart">
          <svg viewBox="0 0 800 220" preserveAspectRatio="none">
            <defs>
              <linearGradient id="rh-chart-fill" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isUp ? "var(--yes)" : "var(--no)"}
                  stopOpacity="0.32"
                />
                <stop
                  offset="100%"
                  stopColor={isUp ? "var(--yes)" : "var(--no)"}
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            <path d={chart.fill} fill="url(#rh-chart-fill)" />
            <path
              d={chart.line}
              stroke={isUp ? "var(--yes)" : "var(--no)"}
              strokeWidth={2.5}
              fill="none"
            />
          </svg>
          <div className="rh-periods" role="tablist" aria-label="Chart range">
            {HERO_PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                className={`rh-period ${p === "1D" ? "is-active" : ""}`}
                aria-selected={p === "1D"}
                disabled
                title="Time-period selection coming with backend price history"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="rh-actions">
          <Link href={`/market/${market.ticker}`} className="rh-buy-yes">
            Buy YES · {yes}¢
          </Link>
          <Link href={`/market/${market.ticker}`} className="rh-buy-no">
            Buy NO · {no}¢
          </Link>
        </div>

        <div className="rh-stats">
          <div>
            <div className="rh-stat-label">24h volume</div>
            <div className="rh-stat-value">{volumeLabel}</div>
          </div>
          <div>
            <div className="rh-stat-label">Open interest</div>
            <div className="rh-stat-value">{oiLabel}</div>
          </div>
          <div>
            <div className="rh-stat-label">Traders</div>
            <div className="rh-stat-value">—</div>
          </div>
          <div>
            <div className="rh-stat-label">Closes</div>
            <div className="rh-stat-value">{closesLabel}</div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function PredictDiscoveryPage() {
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MarketFilterValue>(EMPTY_FILTER);

  // Initial load: discovery sections + categories list.
  useEffect(() => {
    let cancelled = false;
    api
      .getDiscovery()
      .then((d) => {
        if (!cancelled) setDiscovery(d);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Discovery load failed:", msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    api
      .getCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = discovery?.featured ?? [];
  const trending = discovery?.trending ?? [];

  const marquee = featured[0] ?? trending[0] ?? null;
  const featuredRest = marquee
    ? featured.filter((m) => m.id !== marquee.id)
    : featured;

  // For the hero eyebrow we want the category NAME, not the id.
  const heroCategory = marquee
    ? categories.find((c) => {
        const prefix = marquee.ticker.split("-")[0].toLowerCase();
        return (
          c.slug.toLowerCase() === prefix || c.name.toLowerCase() === prefix
        );
      })?.name
    : undefined;

  if (loading) {
    return (
      <div
        style={{
          color: "var(--t3)",
          fontSize: 13,
          padding: 80,
          textAlign: "center",
        }}
      >
        Loading markets…
      </div>
    );
  }

  // Category pills scope All Markets. When a category is active, Featured
  // hides (Featured is curated across all categories, not within one).
  // Hero + Top Movers always show.
  const filterCategoryId = categories.find(
    (c) => c.slug === filter.categorySlug,
  )?.id;
  const filterActive = isFilterActive(filter);

  return (
    <div>
      <style>{`
        .pred-discovery-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
          align-items: start;
          margin-bottom: 32px;
        }
        .pred-discovery-grid > .pred-hero-cell {
          min-width: 0;
        }
        @media (max-width: 960px) {
          .pred-discovery-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <MarketFilterBar
        categories={categories}
        value={filter}
        onChange={setFilter}
      />

      <div className="pred-discovery-grid">
        <div className="pred-hero-cell">
          <DiscoveryHero market={marquee} categoryName={heroCategory} />
        </div>
        <TrendingSidebar markets={trending} />
      </div>

      {!filterActive && featuredRest.length > 0 && (
        <>
          <SectionHead title="Featured markets" count={featured.length} />
          <MarketGrid markets={featuredRest} />
        </>
      )}

      <AllMarketsSection categoryId={filterCategoryId} />
    </div>
  );
}
