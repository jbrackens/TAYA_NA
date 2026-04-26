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
  dateWindowToCloseBefore,
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

const api = createPredictionClient();

// CategoryChips removed in favor of MarketFilterBar (see ../components/
// prediction/MarketFilterBar.tsx). The chips navigated to /category/[slug];
// the new bar filters in-place on this page. /category routes still work
// for direct links and external navigation.

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
        className="glass"
        style={{
          padding: 32,
          minHeight: 220,
          borderRadius: "var(--r-lg)",
          color: "var(--t3)",
        }}
      >
        Loading a featured market…
      </section>
    );
  }
  const isOpen = market.status === "open";
  const volumeDollars = market.volumeCents / 100;
  const volumeLabel =
    volumeDollars >= 1000
      ? `$${(volumeDollars / 1000).toFixed(1)}K`
      : `$${volumeDollars.toFixed(0)}`;
  return (
    <>
      <style>{`
        .pred-hero {
          padding: 32px;
          border-radius: var(--r-lg);
        }
        .pred-hero-pills {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .pred-hero-live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 80, 80, 0.15);
          border: 1px solid rgba(255, 120, 120, 0.25);
          color: #ffbdbd;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          padding: 5px 10px 5px 8px;
          border-radius: var(--r-pill);
        }
        .pred-hero-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #ff9a9a 0%, #ff4444 100%);
          box-shadow: 0 0 8px rgba(255, 80, 80, 0.9);
          animation: pred-hero-pulse 1.6s ease-in-out infinite;
        }
        @keyframes pred-hero-pulse { 50% { opacity: 0.4; transform: scale(0.92); } }
        .pred-hero-eyebrow {
          color: var(--t3);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .pred-hero-eyebrow strong { color: var(--accent); }
        .pred-hero-q {
          font-size: 36px;
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -0.02em;
          margin: 0 0 20px;
          max-width: 820px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .pred-hero-row {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }
        .pred-hero-prices {
          display: flex;
          gap: 10px;
        }
        .pred-hero-price {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 10px 14px;
          border-radius: var(--r-sm);
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.06);
          min-width: 104px;
        }
        .pred-hero-price .lbl {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .pred-hero-price.yes .lbl { color: var(--yes); }
        .pred-hero-price.no  .lbl { color: var(--no); }
        .pred-hero-price .v {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 22px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
          margin-top: 4px;
        }
        .pred-hero-price.yes .v { color: var(--yes); }
        .pred-hero-price.no  .v { color: var(--no); }

        .pred-hero-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 20px;
          border-radius: var(--r-md);
          color: #04140a;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 50%),
            linear-gradient(115deg, #2be480 0%, #00ffaa 100%);
          border: 1px solid rgba(43, 228, 128, 0.6);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.5),
            0 10px 28px rgba(43, 228, 128, 0.18);
          transition: transform 180ms ease, filter 180ms ease;
        }
        .pred-hero-cta:hover { transform: translateY(-1px); filter: brightness(1.05); }

        .pred-hero-secondary {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          color: var(--t2);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          padding: 10px 14px;
          border-radius: var(--r-pill);
          transition: color 150ms ease, background 150ms ease;
        }
        .pred-hero-secondary:hover { color: var(--t1); background: rgba(255, 255, 255, 0.06); }

        .pred-hero-vol {
          margin-left: auto;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--t3);
          font-variant-numeric: tabular-nums;
        }
        .pred-hero-vol strong { color: var(--t1); }

        @media (max-width: 720px) {
          .pred-hero { padding: 24px; }
          .pred-hero-q { font-size: 24px; }
          .pred-hero-vol { margin-left: 0; width: 100%; }
        }
      `}</style>
      <section className="glass pred-hero" aria-label="Featured market">
        <div className="pred-hero-pills">
          {isOpen && (
            <span className="pred-hero-live">
              <span className="pred-hero-live-dot" aria-hidden="true" />
              LIVE
            </span>
          )}
          <span className="pred-hero-eyebrow">
            <strong>FEATURED</strong>
            {categoryName ? ` · ${categoryName.toUpperCase()}` : ""} ·{" "}
            {market.ticker}
          </span>
        </div>
        <h1 className="pred-hero-q">{market.title}</h1>
        <div className="pred-hero-row">
          <div className="pred-hero-prices">
            <div className="pred-hero-price yes">
              <span className="lbl">YES</span>
              <span className="v">{market.yesPriceCents}¢</span>
            </div>
            <div className="pred-hero-price no">
              <span className="lbl">NO</span>
              <span className="v">{market.noPriceCents}¢</span>
            </div>
          </div>
          <Link href={`/market/${market.ticker}`} className="pred-hero-cta">
            Trade now
          </Link>
          <Link
            href={`/market/${market.ticker}`}
            className="pred-hero-secondary"
          >
            View details →
          </Link>
          <span className="pred-hero-vol">
            Vol <strong>{volumeLabel}</strong> · {market.yesPriceCents}¢ YES
          </span>
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

  // Pills filter only the All Markets section. Hero, Trending sidebar, and
  // Featured grid stay visible regardless of filter state.
  const filterCategoryId = categories.find(
    (c) => c.slug === filter.categorySlug,
  )?.id;
  const filterCloseBefore = dateWindowToCloseBefore(filter.dateWindow);

  return (
    <div>
      <style>{`
        .pred-discovery-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
          align-items: start;
        }
        .pred-discovery-grid > .pred-hero-cell {
          min-width: 0;
        }
        @media (max-width: 960px) {
          .pred-discovery-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="pred-discovery-grid">
        <div className="pred-hero-cell">
          <DiscoveryHero market={marquee} categoryName={heroCategory} />
        </div>
        <TrendingSidebar markets={trending} limit={3} />
      </div>

      {featuredRest.length > 0 && (
        <>
          <SectionHead title="Featured markets" count={featured.length} />
          <MarketGrid markets={featuredRest} />
        </>
      )}

      <MarketFilterBar
        categories={categories}
        value={filter}
        onChange={setFilter}
      />

      <AllMarketsSection
        categoryId={filterCategoryId}
        closeBefore={filterCloseBefore}
      />
    </div>
  );
}
