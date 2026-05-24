"use client";

/**
 * PredictDiscoveryPage — the prediction homepage.
 *
 * Structure:
 *   [Hero row]          ← FeaturedCarousel (1fr) + TrendingSidebar (320px)
 *   [Featured grid]     ← curated highlights (excludes carousel markets)
 *   [All Markets grid]  ← paginated full market list, scoped by the filter
 *
 * The hero is a carousel of the top market from All / Sports / Crypto /
 * Politics (see FeaturedCarousel). Trending and Closing Soon grids moved
 * to /discover. The pills sit directly above the section they scope; the
 * hero, sidebar, and Featured grid stay visible at all filter states.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingSidebar } from "../components/prediction/TrendingSidebar";
import { AllMarketsSection } from "../components/prediction/AllMarketsSection";
import { SectionHead } from "../components/prediction/SectionHead";
import { MarketGrid } from "../components/prediction/MarketGrid";
import {
  FeaturedCarousel,
  type FeaturedSlide,
} from "../components/prediction/FeaturedCarousel";
import { logger } from "../lib/logger";
import type {
  Category,
  DiscoveryResponse,
  PredictionMarket,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

// The Featured hero carousel shows the top market from "All" (the curated
// discovery pick), then the highest-volume open market in each of these
// categories, in order. Slugs match the gateway's category slugs.
const FEATURED_CATEGORY_SLUGS = ["sports", "crypto", "politics"] as const;

// Open markets ranked by volume (most active first). The carousel then picks
// the highest-volume market in each category that isn't already on an earlier
// slide, so every slide shows a distinct market.
function rankByVolume(markets: PredictionMarket[]): PredictionMarket[] {
  return [...markets].sort((a, b) => b.volumeCents - a.volumeCents);
}

export default function PredictDiscoveryPage() {
  const { t } = useTranslation("prediction");
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredSlides, setFeaturedSlides] = useState<FeaturedSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroError, setHeroError] = useState(false);

  // Initial load: discovery + categories, then build the featured carousel.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [disc, cats] = await Promise.all([
          api.getDiscovery(),
          api.getCategories(),
        ]);
        if (cancelled) return;
        setDiscovery(disc);
        setCategories(cats);

        // Slide 1: top market from "All" — the curated discovery pick (the
        // prior single-hero market). Slides 2-4: the highest-volume open
        // market in Sports / Crypto / Politics, fetched in parallel with the
        // same categoryId-filtered query /category/[slug] uses.
        const allTop = disc.featured[0] ?? disc.trending[0] ?? null;
        const catLists = await Promise.all(
          FEATURED_CATEGORY_SLUGS.map(async (slug) => {
            const cat = cats.find((c) => c.slug.toLowerCase() === slug);
            if (!cat) return null;
            try {
              const res = await api.getMarkets({
                categoryId: cat.id,
                status: "open",
                pageSize: 50,
              });
              return { category: cat, ranked: rankByVolume(res.data ?? []) };
            } catch (err: unknown) {
              logger.error(
                "PredictDiscovery",
                `featured "${slug}" markets load failed`,
                err,
              );
              return null;
            }
          }),
        );
        if (cancelled) return;

        // Build slides in order, keeping every market distinct: a category
        // whose top market is already shown (e.g. it is also the overall
        // "All" pick) falls through to its next highest-volume market. A
        // category with no remaining unused open market is skipped, so the
        // carousel adapts to whatever is available.
        const slides: FeaturedSlide[] = [];
        const used = new Set<string>();
        if (allTop) {
          slides.push({ key: "all", label: "All", market: allTop });
          used.add(allTop.id);
        }
        for (const cl of catLists) {
          if (!cl) continue;
          const pick = cl.ranked.find((m) => !used.has(m.id));
          if (!pick) continue;
          used.add(pick.id);
          slides.push({
            key: cl.category.slug,
            label: cl.category.name,
            market: pick,
            categoryName: cl.category.name,
          });
        }
        setFeaturedSlides(slides);
      } catch (err: unknown) {
        if (!cancelled) setHeroError(true);
        logger.error("PredictDiscovery", "discovery load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const trending = discovery?.trending ?? [];
  const featured = discovery?.featured ?? [];
  // Don't repeat carousel markets in the Featured grid directly below it.
  const carouselIds = new Set(featuredSlides.map((s) => s.market.id));
  const featuredRest = featured.filter((m) => !carouselIds.has(m.id));

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
        {t("LOADING_MARKETS")}
      </div>
    );
  }

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
          <FeaturedCarousel
            slides={featuredSlides}
            loading={loading}
            error={heroError}
          />
        </div>
        <TrendingSidebar markets={trending} />
      </div>

      {featuredRest.length > 0 && (
        <>
          <SectionHead title={t("FEATURED_MARKETS")} count={featuredRest.length} />
          <MarketGrid markets={featuredRest} />
        </>
      )}

      <AllMarketsSection categories={categories} />
    </div>
  );
}
