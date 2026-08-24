"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import type {
  Category,
  DiscoveryResponse,
} from "@taptrade-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import TapDot from "../components/TapDot";
import { PredictionWorkspace } from "../components/prediction/PredictionWorkspace";
import { logger } from "../lib/logger";

const api = createPredictionClient();

const LAUNCH_DISCOVERY_CATEGORIES = new Set([
  "sports",
  "politics",
  "entertainment",
  "tech",
  "technology",
  "economics",
]);

const ROUTE_STATE_CLASS =
  "grid min-h-[calc(100vh-64px)] place-items-center bg-[var(--bg-deep)] px-6 text-center text-[13px] text-[var(--t3)]";

export default function PredictDiscoveryPage() {
  const { t } = useTranslation("prediction");
  const searchParams = useSearchParams();
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadNonce is the retry signal — an intentional extra dependency
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([api.getDiscovery(), api.getCategories()])
      .then(([nextDiscovery, nextCategories]) => {
        if (cancelled) return;
        setDiscovery(nextDiscovery);
        setCategories(nextCategories);
      })
      .catch((err: unknown) => {
        logger.error("PredictDiscovery", "discovery load failed", err);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      api
        .getDiscovery()
        .then(setDiscovery)
        .catch((err: unknown) => {
          logger.warn("PredictDiscovery", "background refresh failed", err);
        });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className={ROUTE_STATE_CLASS}>
        <TapDot label={t("LOADING_MARKETS")} />
      </div>
    );
  }

  if (error || !discovery) {
    return (
      <div className={ROUTE_STATE_CLASS}>
        <div>
          <h1 className="type-display m-0 text-[24px] font-semibold text-[var(--t1)]">
            {t("COULD_NOT_LOAD_FEATURED_MARKETS")}
          </h1>
          <button
            type="button"
            onClick={() => setReloadNonce((value) => value + 1)}
            className="mt-5 min-h-11 cursor-pointer rounded-md border border-[var(--border-2)] bg-[var(--surface-1)] px-6 text-[13px] font-semibold text-[var(--t1)] hover:bg-[var(--surface-2)]"
          >
            {t("RETRY")}
          </button>
        </div>
      </div>
    );
  }

  const railCategories = categories.filter((category) =>
    LAUNCH_DISCOVERY_CATEGORIES.has(category.slug.toLowerCase()),
  );
  const activeCategorySlug = (
    searchParams?.get("category") || ""
  ).toLowerCase();
  const activeCategory = railCategories.find(
    (category) => category.slug.toLowerCase() === activeCategorySlug,
  );

  return (
    <PredictionWorkspace
      discovery={discovery}
      categories={railCategories}
      catalogCategories={categories}
      activeCategorySlug={activeCategory?.slug.toLowerCase()}
      activeCategoryId={activeCategory?.id}
    />
  );
}
