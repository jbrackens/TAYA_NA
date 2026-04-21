import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";

export function formatCompactUsd(cents: number): string {
  const dollars = Math.max(0, cents) / 100;

  if (dollars >= 1_000_000) {
    return trimTrailingZero(`$${(dollars / 1_000_000).toFixed(1)}M`);
  }

  if (dollars >= 1_000) {
    return trimTrailingZero(`$${(dollars / 1_000).toFixed(1)}K`);
  }

  if (dollars >= 100) {
    return `$${Math.round(dollars).toLocaleString()}`;
  }

  return `$${dollars.toFixed(2)}`;
}

export function formatTimeLeft(closeAt: string): string {
  const diff = new Date(closeAt).getTime() - Date.now();
  if (diff <= 0) return "Closed";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
    return `${mins}m left`;
  }

  if (hours < 24) return `${hours}h left`;

  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

export function dedupeMarkets(markets: PredictionMarket[]): PredictionMarket[] {
  const seen = new Set<string>();

  return markets.filter((market) => {
    const key = market.id || market.ticker;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sortMarketsByVolume(
  markets: PredictionMarket[],
): PredictionMarket[] {
  return [...markets].sort((a, b) => b.volumeCents - a.volumeCents);
}

export function normalizePriceShares(
  yesPriceCents: number,
  noPriceCents: number,
) {
  const total = yesPriceCents + noPriceCents;
  if (total <= 0) {
    return { yesShare: 50, noShare: 50 };
  }

  return {
    yesShare: (yesPriceCents / total) * 100,
    noShare: (noPriceCents / total) * 100,
  };
}

function trimTrailingZero(value: string): string {
  return value.replace(/\.0([MK])$/, "$1");
}
