"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { MarketCard } from "../../components/prediction/MarketCard";
import {
  categoryName,
  localizedMarket,
} from "../../components/prediction/market-content";
import { logger } from "../../lib/logger";
import type {
  PredictionMarket,
  Category,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

const ROUTE_LOADING_CLASS = "p-20 text-center text-[13px] text-[var(--t3)]";
const CATEGORY_HEAD_CLASS =
  "mb-6 flex flex-wrap items-baseline justify-between gap-3 font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif]";
const CATEGORY_TITLE_CLASS =
  "m-0 font-['Inter',_sans-serif] text-[28px] font-bold tracking-[-0.02em] text-[var(--t1)]";
const CATEGORY_SUB_CLASS =
  "font-['IBM_Plex_Mono',_monospace] text-xs text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const CATEGORY_GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,_minmax(300px,_1fr))] gap-4";
const CATEGORY_EMPTY_CLASS =
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-5 py-14 text-center text-[13px] text-[var(--t3)]";

export default function CategoryPage() {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const params = useParams() ?? {};
  const slug = (params.slug as string | undefined) ?? "";

  const [category, setCategory] = useState<Category | null>(null);
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cat = await api.getCategory(slug);
        if (cancelled) return;
        setCategory(cat);
        // Markets are queried directly with a categoryId filter (the gateway
        // joins markets → events → category). This surfaces both real and
        // synthetic-hosted markets in one flat list — synthetic events are
        // hidden from event listings but their markets still belong to the
        // category and should appear here.
        const marketsRes = await api.getMarkets({
          categoryId: cat.id,
          status: "open",
          pageSize: 200,
        });
        if (cancelled) return;
        setMarkets(marketsRes.data || []);
      } catch (err: unknown) {
        logger.error("CategoryPage", "load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return <div className={ROUTE_LOADING_CLASS}>{t("LOADING_MARKETS")}</div>;
  }

  return (
    <div>
      <header className={CATEGORY_HEAD_CLASS}>
        <h1 className={CATEGORY_TITLE_CLASS}>
          {category ? categoryName(contentT, category) : slug}
        </h1>
        <p className={CATEGORY_SUB_CLASS}>
          {t("OPEN_MARKET_COUNT", { count: markets.length })}
        </p>
      </header>

      {markets.length === 0 ? (
        <div className={CATEGORY_EMPTY_CLASS}>
          {t("NO_OPEN_MARKETS_IN_CATEGORY")}
        </div>
      ) : (
        <div className={CATEGORY_GRID_CLASS}>
          {markets.map((market) => {
            const m = localizedMarket(contentT, market);
            return (
              <MarketCard
                key={m.id}
                ticker={m.ticker}
                title={m.title}
                yesPriceCents={m.yesPriceCents}
                noPriceCents={m.noPriceCents}
                volumeCents={m.volumeCents}
                liquidityCents={m.liquidityCents}
                closeAt={m.closeAt}
                status={m.status}
                imagePath={m.imagePath}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
