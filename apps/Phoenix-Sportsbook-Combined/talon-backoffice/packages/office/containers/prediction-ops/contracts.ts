export type PredictionOutcome = {
  outcomeId: string;
  label: string;
  priceCents: number;
  change1d: number;
};

export type PredictionMarket = {
  marketId: string;
  slug: string;
  title: string;
  shortTitle: string;
  categoryKey: string;
  categoryLabel: string;
  status: string;
  featured: boolean;
  live: boolean;
  closesAt: string;
  resolvesAt: string;
  volumeUsd: number;
  liquidityUsd: number;
  participants: number;
  summary: string;
  insight: string;
  rules: string[];
  tags: string[];
  resolutionSource: string;
  heroMetricLabel: string;
  heroMetricValue: string;
  probabilityPercent: number;
  priceChangePercent: number;
  outcomes: PredictionOutcome[];
  relatedMarketIds: string[];
};

export type PredictionAdminCategorySummary = {
  key: string;
  label: string;
  marketCount: number;
  liveMarketCount: number;
  openMarketCount: number;
  resolvedMarketCount: number;
};

export type PredictionAdminSummary = {
  totalMarkets: number;
  liveMarkets: number;
  featuredMarkets: number;
  resolvedMarkets: number;
  totalVolumeUsd: number;
  totalLiquidityUsd: number;
  totalOrders: number;
  openOrders: number;
  cancelledOrders: number;
  categories: PredictionAdminCategorySummary[];
  topMarkets: PredictionMarket[];
};

export type PredictionMarketsResponse = {
  totalCount: number;
  markets: PredictionMarket[];
};

export type PredictionOrder = {
  orderId: string;
  punterId: string;
  marketId: string;
  marketTitle: string;
  categoryKey: string;
  categoryLabel: string;
  outcomeId: string;
  outcomeLabel: string;
  priceCents: number;
  stakeUsd: number;
  shares: number;
  maxPayoutUsd: number;
  maxProfitUsd: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  marketStatus?: string;
  winningOutcomeLabel?: string;
  settledAt?: string;
  settlementReason?: string;
  settlementActor?: string;
  previousSettledAt?: string;
  previousSettledAmountUsd?: number;
  previousSettlementStatus?: string;
};

export type PredictionLifecycleAction =
  | "suspend"
  | "open"
  | "cancel"
  | "resolve"
  | "resettle";

export type PredictionLifecycleHistoryItem = {
  id: string;
  action: PredictionLifecycleAction;
  marketStatusBefore: string;
  marketStatusAfter: string;
  outcomeId?: string;
  outcomeLabel?: string;
  performedBy: string;
  reason: string;
  performedAt: string;
};

export type PredictionLifecycleHistoryResponse = {
  marketId: string;
  totalCount: number;
  items: PredictionLifecycleHistoryItem[];
};

export type PredictionOrdersResponse = {
  totalCount: number;
  orders: PredictionOrder[];
};

export type PredictionMarketDetailResponse = {
  market: PredictionMarket;
  relatedMarkets: PredictionMarket[];
};

export const normalizePredictionSummary = (
  payload?: Partial<PredictionAdminSummary>,
): PredictionAdminSummary => ({
  totalMarkets: Number(payload?.totalMarkets || 0),
  liveMarkets: Number(payload?.liveMarkets || 0),
  featuredMarkets: Number(payload?.featuredMarkets || 0),
  resolvedMarkets: Number(payload?.resolvedMarkets || 0),
  totalVolumeUsd: Number(payload?.totalVolumeUsd || 0),
  totalLiquidityUsd: Number(payload?.totalLiquidityUsd || 0),
  totalOrders: Number(payload?.totalOrders || 0),
  openOrders: Number(payload?.openOrders || 0),
  cancelledOrders: Number(payload?.cancelledOrders || 0),
  categories: Array.isArray(payload?.categories) ? payload!.categories! : [],
  topMarkets: Array.isArray(payload?.topMarkets) ? payload!.topMarkets! : [],
});

export const normalizePredictionMarkets = (
  payload?: Partial<PredictionMarketsResponse>,
): PredictionMarketsResponse => ({
  totalCount: Number(payload?.totalCount || 0),
  markets: Array.isArray(payload?.markets) ? payload!.markets! : [],
});

export const normalizePredictionMarketDetail = (
  payload?: Partial<PredictionMarketDetailResponse>,
): PredictionMarketDetailResponse | null => {
  if (!payload?.market) {
    return null;
  }
  return {
    market: payload.market,
    relatedMarkets: Array.isArray(payload.relatedMarkets)
      ? payload.relatedMarkets
      : [],
  };
};

const normalizeGoOrder = (raw: any): PredictionOrder => {
  if (!raw || typeof raw !== "object") {
    return raw;
  }
  const isGoFormat = "order_id" in raw || "market_id" in raw;
  if (!isGoFormat) {
    return raw as PredictionOrder;
  }
  return {
    orderId: raw.order_id ?? raw.orderId ?? "",
    punterId: raw.user_id ?? raw.punterId ?? "",
    marketId: raw.market_id ?? raw.marketId ?? "",
    marketTitle: raw.market_title ?? raw.marketTitle ?? "",
    categoryKey: raw.category_key ?? raw.categoryKey ?? "",
    categoryLabel: raw.category_label ?? raw.categoryLabel ?? "",
    outcomeId: raw.outcome_id ?? raw.outcomeId ?? "",
    outcomeLabel: raw.outcome_label ?? raw.outcomeLabel ?? "",
    priceCents: Number(raw.price_cents ?? raw.priceCents ?? 0),
    stakeUsd: Number(raw.stake_usd ?? raw.stakeUsd ?? 0),
    shares: Number(raw.shares ?? 0),
    maxPayoutUsd: Number(raw.max_payout_usd ?? raw.maxPayoutUsd ?? 0),
    maxProfitUsd: Number(raw.max_profit_usd ?? raw.maxProfitUsd ?? 0),
    status: raw.status ?? "",
    createdAt: raw.placed_at ?? raw.createdAt ?? "",
    updatedAt: raw.updated_at ?? raw.updatedAt ?? "",
    marketStatus: raw.market_status ?? raw.marketStatus,
    winningOutcomeLabel: raw.winning_outcome_label ?? raw.winningOutcomeLabel,
    settledAt: raw.settled_at ?? raw.settledAt,
    settlementReason: raw.settlement_note ?? raw.settlementReason,
    settlementActor: raw.settlement_actor ?? raw.settlementActor,
    previousSettledAt: raw.previous_settled_at ?? raw.previousSettledAt,
    previousSettledAmountUsd:
      raw.previous_settled_amount_usd ?? raw.previousSettledAmountUsd,
    previousSettlementStatus:
      raw.previous_settlement_status ?? raw.previousSettlementStatus,
  };
};

export const normalizePredictionOrders = (
  payload?: Partial<PredictionOrdersResponse> & { total_count?: number },
): PredictionOrdersResponse => {
  const rawOrders = Array.isArray(payload?.orders) ? payload!.orders! : [];
  return {
    totalCount: Number(
      payload?.totalCount ?? (payload as any)?.total_count ?? 0,
    ),
    orders: rawOrders.map(normalizeGoOrder),
  };
};

export const normalizePredictionLifecycleHistory = (
  payload?: Partial<PredictionLifecycleHistoryResponse>,
): PredictionLifecycleHistoryResponse => ({
  marketId: `${payload?.marketId || ""}`,
  totalCount: Number(payload?.totalCount || 0),
  items: Array.isArray(payload?.items) ? payload!.items! : [],
});
