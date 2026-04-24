"use client";

/**
 * PredictDiscoveryPage — the prediction homepage, Liquid Glass edition.
 *
 * Structure (DESIGN.md §6 + §8):
 *   [CategoryChips]    ← horizontal .glass.glass-thin chip strip
 *   [DiscoveryHero]    ← featured market marquee in a .glass panel
 *   [Featured grid]    ← repeat(auto-fill, minmax(300px, 1fr)) of MarketCards
 *   [Trending grid]
 *   [Closing soon]
 *   [Recently added]
 *
 * Retired in this rewrite (DESIGN.md §8 components retired list):
 *   - FeaturedHero (2:1 marquee + activity/movers side column)
 *   - WhaleActivityCard (amber whale-trade list)
 *   - TopMoversCard (dark-broadcast mover list)
 *
 * DiscoveryHero is a single-column, mint-palette glass card: LIVE pill,
 * category pill, market question, YES/NO side-stat row, "Trade now" CTA
 * + "View details" link. No amber, no whale pallete, no fake deltas.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketCard } from "../components/prediction/MarketCard";
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
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          padding: 0 14px;
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
          padding: "28px 32px",
          marginBottom: 28,
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
          padding: 28px 32px;
          margin-bottom: 28px;
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
          .pred-hero { padding: 22px 20px; }
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

function MarketGrid({ markets }: { markets: PredictionMarket[] }) {
  if (!markets || markets.length === 0) return null;
  return (
    <>
      <style>{`
        .pred-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
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
          margin: 32px 0 14px;
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
          text-shadow: 0 0 6px var(--accent-glow-color);
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

  return (
    <div>
      <CategoryChips categories={categories} />
      <DiscoveryHero market={marquee} categoryName={heroCategory} />

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
