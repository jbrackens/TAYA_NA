import { ParsedUrlQuery } from "querystring";

export const DEFAULT_BREAKDOWN_LIMIT = 20;

export type PromoUsageBreakdown = {
  id: string;
  betCount: number;
  totalStakeCents: number;
  totalFreebetAppliedCents: number;
};

export type PromoUsageSummary = {
  totalBets: number;
  totalStakeCents: number;
  betsWithFreebet: number;
  betsWithOddsBoost: number;
  betsWithBoth: number;
  totalFreebetAppliedCents: number;
  totalBoostedStakeCents: number;
  uniqueUsers: number;
  uniqueFreebets: number;
  uniqueOddsBoosts: number;
  freebets: PromoUsageBreakdown[];
  oddsBoosts: PromoUsageBreakdown[];
};

export type PromoUsageResponse = {
  summary?: Partial<PromoUsageSummary>;
  filters?: Record<string, unknown>;
};

export type PromoUsageFilters = {
  userId: string;
  freebetId: string;
  oddsBoostId: string;
  from: string;
  to: string;
  breakdownLimit: number;
};

export type WalletCorrectionTask = {
  taskId: string;
  userId: string;
  type: string;
  status: string;
  currentBalanceCents: number;
  suggestedAdjustmentCents: number;
  reason: string;
  resolvedBy?: string;
  updatedAt?: string;
};

export type WalletCorrectionSummary = {
  total: number;
  open: number;
  resolved: number;
  negativeBalance: number;
  ledgerDrift: number;
  manualReview: number;
  suggestedAdjustSum: number;
};

export type WalletCorrectionResponse = {
  items?: WalletCorrectionTask[];
  summary?: Partial<WalletCorrectionSummary>;
};

export type RiskPlayerScore = {
  userId: string;
  churnScore: number;
  ltvScore: number;
  riskScore: number;
  modelVersion: string;
  generatedAt: string;
};

export type RiskSegmentProfile = {
  userId: string;
  segmentId: string;
  segmentReason: string;
  riskScore: number;
  hasManualOverride: boolean;
  generatedAt: string;
};

export type RiskSegmentsResponse = {
  items?: RiskSegmentProfile[];
  total?: number;
};

export type DailyReportMetrics = {
  activeUsers: number;
  newUsers: number;
  totalBets: number;
  totalMatched: number;
  totalReturns: number;
  platformProfit: number;
};

export type DailyTransactionSummary = {
  depositsCount: number;
  depositsAmount: number;
  withdrawalsCount: number;
  withdrawalsAmount: number;
  netCash: number;
};

export type DailyReportMarketItem = {
  marketId: string;
  marketType: string;
  totalMatched: number;
  totalBets: number;
  houseProfit: number;
};

export type DailyReportsResponse = {
  date: string;
  generatedAt: string;
  dashboard: {
    date: string;
    metrics: DailyReportMetrics;
  };
  marketReport: {
    data: DailyReportMarketItem[];
  };
  activeExclusions: number;
  transactionSummary: DailyTransactionSummary;
};

const defaultFilters: PromoUsageFilters = {
  userId: "",
  freebetId: "",
  oddsBoostId: "",
  from: "",
  to: "",
  breakdownLimit: DEFAULT_BREAKDOWN_LIMIT,
};

const coerceString = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
};

const coercePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(coerceString(value), 10);
  if (!Number.isNaN(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const coerceNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const toBreakdownItem = (entry: unknown): PromoUsageBreakdown => {
  if (!entry || typeof entry !== "object") {
    return {
      id: "",
      betCount: 0,
      totalStakeCents: 0,
      totalFreebetAppliedCents: 0,
    };
  }
  const typedEntry = entry as Partial<PromoUsageBreakdown>;
  return {
    id: coerceString(typedEntry.id),
    betCount: coerceNumber(typedEntry.betCount),
    totalStakeCents: coerceNumber(typedEntry.totalStakeCents),
    totalFreebetAppliedCents: coerceNumber(typedEntry.totalFreebetAppliedCents),
  };
};

export const parsePromoUsageFiltersFromQuery = (
  query: ParsedUrlQuery,
): PromoUsageFilters => ({
  userId: coerceString(query.userId),
  freebetId: coerceString(query.freebetId),
  oddsBoostId: coerceString(query.oddsBoostId),
  from: coerceString(query.from),
  to: coerceString(query.to),
  breakdownLimit: coercePositiveInt(
    query.breakdownLimit,
    DEFAULT_BREAKDOWN_LIMIT,
  ),
});

export const resetPromoUsageFilters = (): PromoUsageFilters => ({
  ...defaultFilters,
});

export const buildPromoUsageQuery = (
  filters: PromoUsageFilters,
): Record<string, string | number> => {
  const sanitized: PromoUsageFilters = {
    userId: coerceString(filters.userId),
    freebetId: coerceString(filters.freebetId),
    oddsBoostId: coerceString(filters.oddsBoostId),
    from: coerceString(filters.from),
    to: coerceString(filters.to),
    breakdownLimit: coercePositiveInt(
      `${filters.breakdownLimit || ""}`,
      DEFAULT_BREAKDOWN_LIMIT,
    ),
  };

  return {
    ...(sanitized.userId ? { userId: sanitized.userId } : {}),
    ...(sanitized.freebetId ? { freebetId: sanitized.freebetId } : {}),
    ...(sanitized.oddsBoostId ? { oddsBoostId: sanitized.oddsBoostId } : {}),
    ...(sanitized.from ? { from: sanitized.from } : {}),
    ...(sanitized.to ? { to: sanitized.to } : {}),
    breakdownLimit: sanitized.breakdownLimit,
  };
};

export const normalizePromoUsageResponse = (
  response?: PromoUsageResponse,
): PromoUsageSummary => {
  const source = response?.summary || {};
  const freebets = Array.isArray(source.freebets)
    ? source.freebets.map(toBreakdownItem).filter((entry) => entry.id)
    : [];
  const oddsBoosts = Array.isArray(source.oddsBoosts)
    ? source.oddsBoosts.map(toBreakdownItem).filter((entry) => entry.id)
    : [];

  return {
    totalBets: coerceNumber(source.totalBets),
    totalStakeCents: coerceNumber(source.totalStakeCents),
    betsWithFreebet: coerceNumber(source.betsWithFreebet),
    betsWithOddsBoost: coerceNumber(source.betsWithOddsBoost),
    betsWithBoth: coerceNumber(source.betsWithBoth),
    totalFreebetAppliedCents: coerceNumber(source.totalFreebetAppliedCents),
    totalBoostedStakeCents: coerceNumber(source.totalBoostedStakeCents),
    uniqueUsers: coerceNumber(source.uniqueUsers),
    uniqueFreebets: coerceNumber(source.uniqueFreebets),
    uniqueOddsBoosts: coerceNumber(source.uniqueOddsBoosts),
    freebets,
    oddsBoosts,
  };
};

const toCorrectionTask = (entry: unknown): WalletCorrectionTask => {
  if (!entry || typeof entry !== "object") {
    return {
      taskId: "",
      userId: "",
      type: "",
      status: "",
      currentBalanceCents: 0,
      suggestedAdjustmentCents: 0,
      reason: "",
      resolvedBy: "",
      updatedAt: "",
    };
  }
  const typedEntry = entry as Partial<WalletCorrectionTask>;
  return {
    taskId: coerceString(typedEntry.taskId),
    userId: coerceString(typedEntry.userId),
    type: coerceString(typedEntry.type),
    status: coerceString(typedEntry.status),
    currentBalanceCents: coerceNumber(typedEntry.currentBalanceCents),
    suggestedAdjustmentCents: coerceNumber(typedEntry.suggestedAdjustmentCents),
    reason: coerceString(typedEntry.reason),
    resolvedBy: coerceString(typedEntry.resolvedBy),
    updatedAt: coerceString(typedEntry.updatedAt),
  };
};

export const normalizeWalletCorrectionResponse = (
  response?: WalletCorrectionResponse,
): { items: WalletCorrectionTask[]; summary: WalletCorrectionSummary } => {
  const responseItems = response?.items;
  const items: WalletCorrectionTask[] = Array.isArray(responseItems)
    ? responseItems.map(toCorrectionTask).filter((item) => item.taskId)
    : [];
  const summary = response?.summary || {};
  return {
    items,
    summary: {
      total: coerceNumber(summary.total),
      open: coerceNumber(summary.open),
      resolved: coerceNumber(summary.resolved),
      negativeBalance: coerceNumber(summary.negativeBalance),
      ledgerDrift: coerceNumber(summary.ledgerDrift),
      manualReview: coerceNumber(summary.manualReview),
      suggestedAdjustSum: coerceNumber(summary.suggestedAdjustSum),
    },
  };
};

export const normalizeRiskPlayerScore = (
  response?: Partial<RiskPlayerScore>,
): RiskPlayerScore => ({
  userId: coerceString(response?.userId),
  churnScore: coerceNumber(response?.churnScore),
  ltvScore: coerceNumber(response?.ltvScore),
  riskScore: coerceNumber(response?.riskScore),
  modelVersion: coerceString(response?.modelVersion),
  generatedAt: coerceString(response?.generatedAt),
});

const toRiskSegmentProfile = (entry: unknown): RiskSegmentProfile => {
  if (!entry || typeof entry !== "object") {
    return {
      userId: "",
      segmentId: "",
      segmentReason: "",
      riskScore: 0,
      hasManualOverride: false,
      generatedAt: "",
    };
  }
  const typedEntry = entry as Partial<RiskSegmentProfile>;
  return {
    userId: coerceString(typedEntry.userId),
    segmentId: coerceString(typedEntry.segmentId),
    segmentReason: coerceString(typedEntry.segmentReason),
    riskScore: coerceNumber(typedEntry.riskScore),
    hasManualOverride: Boolean(typedEntry.hasManualOverride),
    generatedAt: coerceString(typedEntry.generatedAt),
  };
};

export const normalizeRiskSegmentsResponse = (
  response?: RiskSegmentsResponse,
): RiskSegmentProfile[] => {
  const items = response?.items;
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map(toRiskSegmentProfile)
    .filter((item) => item.userId && item.segmentId);
};

export const normalizeDailyReportsResponse = (
  response?: Partial<DailyReportsResponse>,
): DailyReportsResponse => {
  const dashboard: Partial<DailyReportsResponse["dashboard"]> =
    response?.dashboard || {};
  const metrics: Partial<DailyReportMetrics> = dashboard.metrics || {};
  const marketReportData: unknown[] = Array.isArray(response?.marketReport?.data)
    ? response?.marketReport?.data || []
    : [];

  return {
    date: coerceString(response?.date),
    generatedAt: coerceString(response?.generatedAt),
    dashboard: {
      date: coerceString(dashboard.date),
      metrics: {
        activeUsers: coerceNumber(metrics.activeUsers),
        newUsers: coerceNumber(metrics.newUsers),
        totalBets: coerceNumber(metrics.totalBets),
        totalMatched: coerceNumber(metrics.totalMatched),
        totalReturns: coerceNumber(metrics.totalReturns),
        platformProfit: coerceNumber(metrics.platformProfit),
      },
    },
    marketReport: {
      data: marketReportData.map((entry) => {
        const typedEntry =
          entry && typeof entry === "object"
            ? (entry as Partial<DailyReportMarketItem>)
            : {};
        return {
          marketId: coerceString(typedEntry.marketId),
          marketType: coerceString(typedEntry.marketType),
          totalMatched: coerceNumber(typedEntry.totalMatched),
          totalBets: coerceNumber(typedEntry.totalBets),
          houseProfit: coerceNumber(typedEntry.houseProfit),
        };
      }),
    },
    activeExclusions: coerceNumber(response?.activeExclusions),
    transactionSummary: {
      depositsCount: coerceNumber(response?.transactionSummary?.depositsCount),
      depositsAmount: coerceNumber(response?.transactionSummary?.depositsAmount),
      withdrawalsCount: coerceNumber(
        response?.transactionSummary?.withdrawalsCount,
      ),
      withdrawalsAmount: coerceNumber(
        response?.transactionSummary?.withdrawalsAmount,
      ),
      netCash: coerceNumber(response?.transactionSummary?.netCash),
    },
  };
};
