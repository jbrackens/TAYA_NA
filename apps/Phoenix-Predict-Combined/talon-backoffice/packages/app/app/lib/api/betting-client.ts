import { apiClient } from './client';

// Request types
export interface PlaceBetRequest {
  user_id: string;
  fixture_id: string;
  market_id: string;
  selection_id: string;
  stake: number;
  odds?: number;
}

export interface PlaceParlayRequest {
  user_id: string;
  bets: Array<{
    fixture_id: string;
    market_id: string;
    selection_id: string;
    odds?: number;
  }>;
  stake: number;
}

export interface PrecheckBetsRequest {
  user_id: string;
  bets: Array<{
    fixture_id: string;
    market_id: string;
    selection_id: string;
    stake: number;
    odds?: number;
  }>;
}

interface BetLegRaw {
  marketId: string;
  selectionId: string;
  currentOdds?: number;
  finalOdds?: number;
}

interface UserBetRaw {
  betId: string;
  userId: string;
  marketId: string;
  selectionId: string;
  legs?: BetLegRaw[];
  stakeCents: number;
  odds: number;
  status: string;
  potentialPayoutCents: number;
  placedAt: string;
  settledAt?: string;
}

interface BetHistoryPageRaw {
  currentPage: number;
  data: UserBetRaw[];
  itemsPerPage: number;
  totalCount: number;
  hasNextPage: boolean;
}

interface CashoutOfferRaw {
  cashout_value: number;
  currency: string;
  available: boolean;
  expires_at: string;
}

interface CashoutResponseRaw {
  bet_id: string;
  user_id: string;
  cashout_value: number;
  original_stake: number;
  settled_at: string;
  status: string;
}

interface PrecheckBetsResponseRaw {
  valid: boolean;
  issues: Array<{
    bet_index: number;
    error: string;
  }>;
}

// Normalized response types (camelCase)
export interface BetSelection {
  selectionId: string;
  selectionName: string;
  odds: number;
}

export interface PlaceBetResponse {
  betId: string;
  userId: string;
  fixtureId: string;
  marketId: string;
  selection: BetSelection;
  stake: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceParlayResponse {
  parlayId: string;
  userId: string;
  bets: PlaceBetResponse[];
  totalStake: number;
  totalOdds: number;
  potentialReturn: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserBet {
  betId: string;
  userId: string;
  fixtureId: string;
  marketId: string;
  selection: BetSelection;
  stake: number;
  status: string;
  potentialReturn: number;
  createdAt: string;
  updatedAt: string;
}

export interface BetHistoryPage {
  currentPage: number;
  data: UserBet[];
  itemsPerPage: number;
  totalCount: number;
  hasNextPage: boolean;
}

export interface CashoutOffer {
  cashoutValue: number;
  currency: string;
  available: boolean;
  expiresAt: string;
}

export interface CashoutResponse {
  betId: string;
  userId: string;
  cashoutValue: number;
  originalStake: number;
  settledAt: string;
  status: string;
}

export interface PrecheckBetsResponse {
  valid: boolean;
  issues: Array<{
    betIndex: number;
    error: string;
  }>;
}

function toStakeCents(amount: number): number {
  return Math.round(amount * 100);
}

function buildIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Utility function to normalize snake_case to camelCase
function normalizeSnakeCase(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(normalizeSnakeCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, value]) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      acc[camelKey] = typeof value === 'object' && value !== null
        ? normalizeSnakeCase(value as Record<string, unknown>)
        : value;
      return acc;
    }, {});
  }
  return obj;
}

/**
 * Place a single bet
 */
export async function placeBet(request: PlaceBetRequest): Promise<PlaceBetResponse> {
  const requestId = buildIdempotencyKey('bet');
  const raw = await apiClient.post<Record<string, unknown>>('/api/v1/bets/place/', {
    userId: request.user_id,
    requestId,
    marketId: request.market_id,
    selectionId: request.selection_id,
    stakeCents: toStakeCents(request.stake),
    odds: request.odds ?? 0,
    idempotencyKey: requestId,
  });

  return {
    betId: String(raw.betId ?? ''),
    userId: String(raw.userId ?? request.user_id),
    fixtureId: request.fixture_id,
    marketId: String(raw.marketId ?? request.market_id),
    selection: {
      selectionId: String(raw.selectionId ?? request.selection_id),
      selectionName: String(raw.selectionId ?? request.selection_id),
      odds: Number(raw.odds ?? request.odds ?? 0),
    },
    stake: Number(raw.stakeCents ?? toStakeCents(request.stake)) / 100,
    status: String(raw.status ?? 'placed'),
    createdAt: String(raw.placedAt ?? new Date().toISOString()),
    updatedAt: String(raw.placedAt ?? new Date().toISOString()),
  };
}

/**
 * Place a parlay bet
 */
export async function placeParlay(request: PlaceParlayRequest): Promise<PlaceParlayResponse> {
  const requestId = buildIdempotencyKey('parlay');
  const raw = await apiClient.post<Record<string, unknown>>('/api/v1/bets/place/', {
    userId: request.user_id,
    requestId,
    marketId: request.bets[0]?.market_id ?? '',
    selectionId: request.bets[0]?.selection_id ?? '',
    stakeCents: toStakeCents(request.stake),
    odds: 0,
    idempotencyKey: requestId,
    items: request.bets.map((bet) => ({
      marketId: bet.market_id,
      selectionId: bet.selection_id,
      stakeCents: toStakeCents(request.stake),
      odds: bet.odds ?? 0,
    })),
  });

  const normalizedBets = request.bets.map((bet) => ({
    betId: String(raw.betId ?? requestId),
    userId: request.user_id,
    fixtureId: bet.fixture_id,
    marketId: bet.market_id,
    selection: {
      selectionId: bet.selection_id,
      selectionName: bet.selection_id,
      odds: bet.odds ?? 0,
    },
    stake: request.stake,
    status: String(raw.status ?? 'placed'),
    createdAt: String(raw.placedAt ?? new Date().toISOString()),
    updatedAt: String(raw.placedAt ?? new Date().toISOString()),
  }));

  return {
    parlayId: String(raw.betId ?? requestId),
    userId: String(raw.userId ?? request.user_id),
    bets: normalizedBets,
    totalStake: Number(raw.stakeCents ?? toStakeCents(request.stake)) / 100,
    totalOdds: normalizedBets.reduce((product, bet) => product * (bet.selection.odds || 1), 1),
    potentialReturn: Number(raw.potentialPayoutCents ?? 0) / 100,
    status: String(raw.status ?? 'placed'),
    createdAt: String(raw.placedAt ?? new Date().toISOString()),
    updatedAt: String(raw.placedAt ?? new Date().toISOString()),
  };
}

/**
 * Get all bets for a user
 */
export async function getUserBets(userId: string): Promise<UserBet[]> {
  const result = await getUserBetsPage(userId, { page: 1, pageSize: 100 });
  return result.data;
}

export async function getUserBetsPage(
  userId: string,
  options?: {
    page?: number;
    pageSize?: number;
    status?: string;
  },
): Promise<BetHistoryPage> {
  const raw = await apiClient.get<BetHistoryPageRaw>('/api/v1/bets', {
    userId,
    page: String(options?.page ?? 1),
    pageSize: String(options?.pageSize ?? 20),
    ...(options?.status && options.status !== "all" ? { status: options.status } : {}),
  });

  return {
    currentPage: raw.currentPage,
    itemsPerPage: raw.itemsPerPage,
    totalCount: raw.totalCount,
    hasNextPage: raw.hasNextPage,
    data: (raw.data || []).map((bet) => {
      const primaryLeg = bet.legs?.[0];
      return {
        betId: bet.betId,
        userId: bet.userId,
        fixtureId: "",
        marketId: primaryLeg?.marketId ?? bet.marketId,
        selection: {
          selectionId: primaryLeg?.selectionId ?? bet.selectionId,
          selectionName: primaryLeg?.selectionId ?? bet.selectionId,
          odds: primaryLeg?.finalOdds ?? primaryLeg?.currentOdds ?? bet.odds,
        },
        stake: bet.stakeCents / 100,
        status: bet.status,
        potentialReturn: bet.potentialPayoutCents / 100,
        createdAt: bet.placedAt,
        updatedAt: bet.settledAt ?? bet.placedAt,
      };
    }),
  };
}

/**
 * Get a specific bet by ID
 */
export async function getBet(betId: string): Promise<UserBet> {
  const raw = await apiClient.get<UserBetRaw>(`/api/v1/bets/${betId}`);
  return normalizeSnakeCase(raw) as UserBet;
}

/**
 * Get cashout offer for a bet
 */
export async function getCashoutOffer(betId: string): Promise<CashoutOffer> {
  const raw = await apiClient.post<CashoutOfferRaw>(
    "/api/v1/bets/cashout/quote",
    { betId } as Record<string, unknown>,
  );
  return normalizeSnakeCase(raw) as CashoutOffer;
}

/**
 * Cash out a bet (accept a cashout quote)
 */
export async function cashoutBet(betId: string): Promise<CashoutResponse> {
  const raw = await apiClient.post<CashoutResponseRaw>(
    "/api/v1/bets/cashout/accept",
    { betId } as Record<string, unknown>,
  );
  return normalizeSnakeCase(raw) as CashoutResponse;
}

/**
 * Precheck bets before placement
 */
export async function precheckBets(request: PrecheckBetsRequest): Promise<PrecheckBetsResponse> {
  const raw = await apiClient.post<PrecheckBetsResponseRaw>('/api/v1/bets/precheck/', {
    userId: request.user_id,
    marketId: request.bets[0]?.market_id ?? '',
    selectionId: request.bets[0]?.selection_id ?? '',
    stakeCents: toStakeCents(request.bets[0]?.stake ?? 0),
    odds: request.bets[0]?.odds ?? 0,
    items: request.bets.map((bet) => ({
      marketId: bet.market_id,
      selectionId: bet.selection_id,
      stakeCents: toStakeCents(bet.stake),
      odds: bet.odds ?? 0,
    })),
  });
  return normalizeSnakeCase(raw) as PrecheckBetsResponse;
}

// ── Bet Analytics ──

export interface BetAnalyticsPeriod {
  period: string;
  betCount: number;
  wonCount: number;
  lostCount: number;
  stakeCents: number;
  returnCents: number;
  profitCents: number;
}

export interface BetAnalyticsHeatmapCell {
  dayOfWeek: number;
  hourBucket: number;
  betCount: number;
  wonCount: number;
}

export interface StakeBucket {
  label: string;
  minCents: number;
  maxCents: number;
  count: number;
}

export interface BetAnalytics {
  totalBets: number;
  totalWon: number;
  totalLost: number;
  totalCashedOut: number;
  totalStakeCents: number;
  totalReturnCents: number;
  totalProfitCents: number;
  avgStakeCents: number;
  avgOdds: number;
  winRate: number;
  roi: number;
  daily: BetAnalyticsPeriod[];
  monthly: BetAnalyticsPeriod[];
  heatmap: BetAnalyticsHeatmapCell[];
  stakeBuckets: StakeBucket[];
}

/**
 * Get bet analytics for a user
 */
export async function getBetAnalytics(userId: string): Promise<BetAnalytics> {
  return apiClient.get<BetAnalytics>(`/api/v1/bets/analytics?userId=${encodeURIComponent(userId)}`);
}
