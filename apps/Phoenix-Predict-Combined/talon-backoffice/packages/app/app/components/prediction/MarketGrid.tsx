"use client";

/**
 * MarketGrid — shared responsive grid of MarketCards used across the
 * prediction discovery surfaces (/predict, /discover).
 */

import { MarketCard } from "./MarketCard";
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import { categoryLabel, localizedMarket } from "./market-content";

interface Props {
  markets: PredictionMarket[];
  columns?: 3 | 4;
  watchedMarketIds?: Set<string>;
  onToggleWatchlist?: (marketId: string) => void;
}

const GRID_CLASS_BY_COLUMNS: Record<NonNullable<Props["columns"]>, string> = {
  3: "grid auto-rows-fr grid-cols-3 items-stretch gap-5 max-[1120px]:grid-cols-2 max-[640px]:grid-cols-1 max-[640px]:gap-4",
  4: "grid auto-rows-fr grid-cols-4 items-stretch gap-5 max-[1280px]:grid-cols-3 max-[960px]:grid-cols-2 max-[640px]:grid-cols-1 max-[640px]:gap-4",
};

export function MarketGrid({
  markets,
  columns = 4,
  watchedMarketIds,
  onToggleWatchlist,
}: Props) {
  const { t } = useTranslation("market-content");
  if (!markets || markets.length === 0) return null;
  return (
    <div className={GRID_CLASS_BY_COLUMNS[columns]}>
      {markets.map((market) => {
        const m = localizedMarket(t, market);
        return (
          <MarketCard
            key={m.id}
            marketId={m.id}
            ticker={m.ticker}
            title={m.title}
            yesPriceCents={m.yesPricePointsCents}
            noPriceCents={m.noPricePointsCents}
            volumePointsCents={m.volumePointsCents}
            liquidityPointsCents={m.liquidityPointsCents}
            closeAt={m.closeAt}
            status={m.status}
            categoryLabel={
              m.categorySlug
                ? categoryLabel(t, m.categorySlug)
                : m.categoryName || undefined
            }
            imagePath={m.imagePath}
            imageUrl={m.imageUrl}
            image_url={m.image_url}
            watched={watchedMarketIds?.has(m.id) ?? false}
            onToggleWatchlist={onToggleWatchlist}
          />
        );
      })}
    </div>
  );
}
