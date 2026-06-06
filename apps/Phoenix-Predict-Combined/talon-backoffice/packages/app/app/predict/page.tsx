"use client";

/**
 * PredictDiscoveryPage — the prediction homepage.
 *
 * Structure:
 *   [Hero row]          ← FeaturedCarousel (1fr) + TrendingSidebar (320px)
 *   [All Markets grid]  ← paginated full market list, scoped by the filter
 *
 * The hero is a carousel of the top market from All / Sports / Crypto /
 * Politics (see FeaturedCarousel). Trending and Closing Soon grids moved
 * to /discover. The pills sit directly above the section they scope; the
 * hero and sidebar stay visible at all filter states.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingSidebar } from "../components/prediction/TrendingSidebar";
import { AllMarketsSection } from "../components/prediction/AllMarketsSection";
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
import {
  categoryName,
  localizedMarket,
} from "../components/prediction/market-content";

const api = createPredictionClient();

// The Featured hero carousel shows the top market from "All" (the curated
// discovery pick), then the highest-volume open market in each of these
// categories, in order. Slugs match the gateway's category slugs.
const FEATURED_CATEGORY_SLUGS = ["sports", "crypto", "politics"] as const;

const ROUTE_LOADING_CLASS = "p-20 text-center text-[13px] text-[var(--t3)]";
const DISCOVERY_GRID_CLASS =
  "grid grid-cols-[1fr_320px] items-start gap-5 max-[960px]:grid-cols-1";
const HERO_CELL_CLASS = "min-w-0";

// Open markets ranked by volume (most active first). The carousel then picks
// the highest-volume market in each category that isn't already on an earlier
// slide, so every slide shows a distinct market.
function rankByVolume(markets: PredictionMarket[]): PredictionMarket[] {
  return [...markets].sort((a, b) => b.volumeCents - a.volumeCents);
}

export default function PredictDiscoveryPage() {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
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
          slides.push({
            key: "all",
            label: t("ALL"),
            market: localizedMarket(contentT, allTop),
          });
          used.add(allTop.id);
        }
        for (const cl of catLists) {
          if (!cl) continue;
          const pick = cl.ranked.find((m) => !used.has(m.id));
          if (!pick) continue;
          used.add(pick.id);
          slides.push({
            key: cl.category.slug,
            label: categoryName(contentT, cl.category),
            market: localizedMarket(contentT, pick),
            categoryName: categoryName(contentT, cl.category),
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
  }, [contentT, t]);

  const trending = discovery?.trending ?? [];

  if (loading) {
    return <div className={ROUTE_LOADING_CLASS}>{t("LOADING_MARKETS")}</div>;
  }

  return (
    <div>
      <div className={DISCOVERY_GRID_CLASS}>
        <div className={HERO_CELL_CLASS}>
          <FeaturedCarousel
            slides={featuredSlides}
            loading={loading}
            error={heroError}
          />
        </div>
        <TrendingSidebar markets={trending} />
      </div>

      <AllMarketsSection categories={categories} />
    </div>
  );
}
