"use client";

/**
 * MarketGrid — shared responsive grid of MarketCards used across the
 * prediction discovery surfaces (/predict, /discover).
 */

import { MarketCard } from "./MarketCard";
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";
import { categoryLabel, localizedMarket } from "./market-content";

interface Props {
  markets: PredictionMarket[];
  columns?: 3 | 4;
  watchedMarketIds?: Set<string>;
  onToggleWatchlist?: (marketId: string) => void;
}

// P11 "Standing Question": briefs sit in newspaper columns — generous
// gutters and, on >=1024px, a hairline column rule down every gutter.
// The rules are nth-child selectors keyed to each breakpoint's column
// count, so "Load more" pagination (appending children) and category
// filtering re-rule themselves automatically.
const GRID_CLASS_BY_COLUMNS: Record<NonNullable<Props["columns"]>, string> = {
  3: "grid auto-rows-fr grid-cols-3 items-stretch gap-x-6 gap-y-8 max-[1120px]:grid-cols-2 max-[640px]:grid-cols-1 max-[640px]:gap-4 min-[1024px]:[&>*]:border-[var(--border-1)] min-[1121px]:[&>*:not(:nth-child(3n+1))]:border-l min-[1121px]:[&>*:not(:nth-child(3n+1))]:pl-6 min-[1024px]:max-[1120px]:[&>*:not(:nth-child(2n+1))]:border-l min-[1024px]:max-[1120px]:[&>*:not(:nth-child(2n+1))]:pl-6",
  4: "grid auto-rows-fr grid-cols-4 items-stretch gap-x-6 gap-y-8 max-[1280px]:grid-cols-3 max-[960px]:grid-cols-2 max-[640px]:grid-cols-1 max-[640px]:gap-4 min-[1024px]:[&>*]:border-[var(--border-1)] min-[1281px]:[&>*:not(:nth-child(4n+1))]:border-l min-[1281px]:[&>*:not(:nth-child(4n+1))]:pl-6 min-[1024px]:max-[1280px]:[&>*:not(:nth-child(3n+1))]:border-l min-[1024px]:max-[1280px]:[&>*:not(:nth-child(3n+1))]:pl-6",
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
      {markets.map((market, index) => {
        const m = localizedMarket(t, market);
        return (
          <div
            key={m.id}
            className="card-in h-full"
            style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}
          >
            <MarketCard
              marketId={m.id}
              ticker={m.ticker}
              title={m.title}
              yesPricePoints={m.yesPricePoints}
              noPricePoints={m.noPricePoints}
              volumePoints={m.volumePoints}
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
          </div>
        );
      })}
    </div>
  );
}
