"use client";

/**
 * MarketGrid — shared responsive grid of MarketCards used across the
 * prediction discovery surfaces (/predict, /discover).
 */

import { MarketCard } from "./MarketCard";
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import { localizedMarket } from "./market-content";

interface Props {
  markets: PredictionMarket[];
}

export function MarketGrid({ markets }: Props) {
  const { t } = useTranslation("market-content");
  if (!markets || markets.length === 0) return null;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,_minmax(300px,_1fr))] gap-4">
      {markets.map((market) => {
        const m = localizedMarket(t, market);
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
            imageUrl={m.imageUrl}
            image_url={m.image_url}
          />
        );
      })}
    </div>
  );
}
