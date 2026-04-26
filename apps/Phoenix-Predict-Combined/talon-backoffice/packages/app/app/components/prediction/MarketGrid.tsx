"use client";

/**
 * MarketGrid — shared responsive grid of MarketCards used across the
 * prediction discovery surfaces (/predict, /discover).
 */

import { MarketCard } from "./MarketCard";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";

interface Props {
  markets: PredictionMarket[];
}

export function MarketGrid({ markets }: Props) {
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
            imagePath={m.imagePath}
          />
        ))}
      </div>
    </>
  );
}
