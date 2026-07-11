import type {
  MarketStatus,
  PredictionMarket,
} from "@taptrade-ui/api-client/src/prediction-types";

type Translate = (key: string, options?: Record<string, unknown>) => string;

// Points unit-model (2026-07-07): 1 Point = 1 cent of play value; API
// integers ARE whole Points. No /100 conversion, no fractional Points.
//
// formatWholePoints is the shared balance/stat formatter (P10, 2026-07-12):
// whole points with locale grouping, never fractional, no compaction.
export function formatWholePoints(points: number): string {
  return `${Math.round(points).toLocaleString()} pts`;
}

export function formatCompactPoints(points: number): string {
  const value = Math.max(0, points);

  if (value >= 1_000_000) {
    return trimTrailingZero(`${(value / 1_000_000).toFixed(1)}M pts`);
  }

  if (value >= 1_000) {
    return trimTrailingZero(`${(value / 1_000).toFixed(1)}K pts`);
  }

  return `${Math.round(value).toLocaleString()} pts`;
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

export function isOpenMarketStatus(status: MarketStatus | string): boolean {
  return status === "open";
}

export function marketStatusLabel(
  status: MarketStatus | string,
  t: Translate,
): string {
  switch (status) {
    case "open":
      return t("LIVE");
    case "unopened":
      return t("UNOPENED");
    case "halted":
      return t("HALTED");
    case "closed":
      return t("CLOSED");
    case "proposed_resolution":
      return t("PROPOSED_RESOLUTION");
    case "disputed":
      return t("DISPUTED");
    case "settled":
      return t("SETTLED");
    case "voided":
      return t("VOIDED");
    default:
      return t("MARKET_STATUS", { status });
  }
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
  return [...markets].sort((a, b) => b.volumePoints - a.volumePoints);
}

export function normalizePriceShares(
  yesPricePoints: number,
  noPricePoints: number,
) {
  const total = yesPricePoints + noPricePoints;
  if (total <= 0) {
    return { yesShare: 50, noShare: 50 };
  }

  return {
    yesShare: (yesPricePoints / total) * 100,
    noShare: (noPricePoints / total) * 100,
  };
}

function trimTrailingZero(value: string): string {
  return value.replace(/\.0([MK])/, "$1");
}
