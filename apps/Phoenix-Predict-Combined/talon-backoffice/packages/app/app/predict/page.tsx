"use client";

/**
 * PredictDiscoveryPage — the prediction homepage.
 *
 * Structure:
 *   [CategoryChips]          ← horizontal .glass.glass-thin chip strip
 *   [FeaturedHero]           ← marquee market + activity card + movers
 *   [Featured markets grid]  ← full grid of MarketCards
 *   [Trending markets grid]
 *   [Closing soon]
 *   [Recently added]
 *
 * CategoryChips moved out of TopBar and into the page body as of
 * Phase 3 (DESIGN.md §6). Phase 4 will redesign the hero + grid to
 * match the full Liquid Glass vocabulary; the chip strip is the
 * Phase-3 down-payment so /predict has category discoverability on
 * day one of the rollout.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketCard } from "../components/prediction/MarketCard";
import { FeaturedHero } from "../components/prediction/FeaturedHero";
import {
  dedupeMarkets,
  sortMarketsByVolume,
} from "../components/prediction/market-display";
import type {
  Category,
  DiscoveryResponse,
  PredictionMarket,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

function CategoryChips({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  return (
    <>
      <style>{`
        .pred-cats {
          display: flex;
          gap: 6px;
          padding: 8px;
          margin: 0 0 20px;
          border-radius: var(--r-pill);
          overflow-x: auto;
          scrollbar-width: none;
        }
        .pred-cats::-webkit-scrollbar { display: none; }
        .pred-cat {
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 500;
          color: var(--t2);
          border-radius: var(--r-pill);
          white-space: nowrap;
          text-decoration: none;
          transition: color 150ms ease, background 150ms ease;
        }
        .pred-cat:hover {
          color: var(--t1);
          background: rgba(255, 255, 255, 0.06);
        }
        .pred-cat.is-all {
          color: var(--t1);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }
      `}</style>
      <nav
        className="glass glass-thin pred-cats"
        aria-label="Market categories"
      >
        <Link href="/predict" className="pred-cat is-all">
          All
        </Link>
        {categories.map((c) => (
          <Link key={c.slug} href={`/category/${c.slug}`} className="pred-cat">
            {c.name}
          </Link>
        ))}
      </nav>
    </>
  );
}

function MarketGrid({ markets }: { markets: PredictionMarket[] }) {
  if (!markets || markets.length === 0) return null;
  return (
    <>
      <style>{`
        .pred-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 14px;
        }
      `}</style>
      <div className="pred-grid">
        {markets.map((m) => (
          <MarketCard
            key={m.id}
            ticker={m.ticker}
            title={m.title}
            yesPriceCents={m.yesPriceCents}
            noPriceCents={m.noPriceCents}
            volumeCents={m.volumeCents}
            openInterestCents={m.openInterestCents}
            liquidityCents={m.liquidityCents}
            closeAt={m.closeAt}
            status={m.status}
          />
        ))}
      </div>
    </>
  );
}

function SectionHead({
  title,
  count,
  href,
}: {
  title: string;
  count?: number;
  href?: string;
}) {
  return (
    <>
      <style>{`
        .pred-section-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin: 28px 0 14px;
        }
        .pred-section-title {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0;
          color: var(--t1);
        }
        .pred-section-link {
          font-size: 13px;
          color: var(--accent);
          text-decoration: none;
        }
        .pred-section-link:hover { text-decoration: underline; }
      `}</style>
      <div className="pred-section-head">
        <h2 className="pred-section-title">{title}</h2>
        {href && (
          <a href={href} className="pred-section-link">
            {count != null ? `See all ${count} →` : "See all →"}
          </a>
        )}
      </div>
    </>
  );
}

export default function PredictDiscoveryPage() {
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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
  const closingSoon = discovery?.closingSoon ?? [];
  const recent = discovery?.recent ?? [];

  // Marquee is the #1 featured market by volume.
  const marquee = featured[0] ?? trending[0] ?? null;
  const featuredRest = marquee
    ? featured.filter((m) => m.id !== marquee.id)
    : featured;
  const activityMarkets = sortMarketsByVolume(
    dedupeMarkets(
      [marquee, ...featuredRest, ...trending, ...closingSoon, ...recent].filter(
        (market): market is PredictionMarket => Boolean(market),
      ),
    ),
  );
  const trendingMarkets = dedupeMarkets(
    trending.length > 0 ? trending : featured,
  );

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

  return (
    <div>
      <CategoryChips categories={categories} />
      <FeaturedHero
        market={marquee}
        activityMarkets={activityMarkets}
        topMovers={trendingMarkets}
      />

      {featuredRest.length > 0 && (
        <>
          <SectionHead title="Featured markets" count={featured.length} />
          <MarketGrid markets={featuredRest} />
        </>
      )}

      {trending.length > 0 && (
        <>
          <SectionHead title="Trending" count={trending.length} />
          <MarketGrid markets={trending} />
        </>
      )}

      {closingSoon.length > 0 && (
        <>
          <SectionHead title="Closing soon" count={closingSoon.length} />
          <MarketGrid markets={closingSoon} />
        </>
      )}

      {recent.length > 0 && (
        <>
          <SectionHead title="Recently added" count={recent.length} />
          <MarketGrid markets={recent} />
        </>
      )}
    </div>
  );
}
