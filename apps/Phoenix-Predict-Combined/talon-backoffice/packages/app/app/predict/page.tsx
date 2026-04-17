"use client";

/**
 * PredictDiscoveryPage — the prediction homepage.
 *
 * Structure (matches the approved design preview):
 *   [FeaturedHero]           ← one marquee market + whale card + top movers
 *   [Featured markets grid]  ← full grid of MarketCards
 *   [Trending markets grid]  ← same card, trending slice
 *   [Closing soon]           ← narrow when empty — safe
 *   [Recently added]
 *
 * The horizontal category chips live in PredictHeader (the app chrome), not
 * here. This page is responsible only for data fetch + layout; chrome is
 * always present.
 */

import { useEffect, useState } from "react";
import { MarketCard } from "../components/prediction/MarketCard";
import { FeaturedHero } from "../components/prediction/FeaturedHero";
import type {
  DiscoveryResponse,
  PredictionMarket,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

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
  const featuredRest = marquee ? featured.filter((m) => m.id !== marquee.id) : featured;

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
      <FeaturedHero market={marquee} topMovers={trending.slice(0, 4)} />

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
