import type {
  MarketStatus,
  PredictionMarket,
} from "@phoenix-ui/api-client/src/prediction-types";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function formatCompactPoints(cents: number): string {
  const points = Math.max(0, cents) / 100;

  if (points >= 1_000_000) {
    return trimTrailingZero(`${(points / 1_000_000).toFixed(1)}M pts`);
  }

  if (points >= 1_000) {
    return trimTrailingZero(`${(points / 1_000).toFixed(1)}K pts`);
  }

  if (points >= 100) {
    return `${Math.round(points).toLocaleString()} pts`;
  }

  return `${points.toFixed(2)} pts`;
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
  return [...markets].sort((a, b) => b.volumePointsCents - a.volumePointsCents);
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
  return value.replace(/\.0([MK])/, "$1");
}
