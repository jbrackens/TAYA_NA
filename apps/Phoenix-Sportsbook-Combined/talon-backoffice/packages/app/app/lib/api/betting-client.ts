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

// Response types (Go API uses snake_case)
interface BetSelectionRaw {
  selection_id: string;
  selection_name: string;
  odds: number;
}

interface PlaceBetResponseRaw {
  bet_id: string;
  user_id: string;
  fixture_id: string;
  market_id: string;
  selection: BetSelectionRaw;
  stake: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PlaceParlayResponseRaw {
  parlay_id: string;
  user_id: string;
  bets: PlaceBetResponseRaw[];
  total_stake: number;
  total_odds: number;
  potential_return: number;
  status: string;
  created_at: string;
  updated_at: string;
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

// Utility function to normalize snake_case to camelCase
function normalizeSnakeCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  if (Array.isArray(obj)) {
    return obj.map(normalizeSnakeCase) as unknown as Record<string, unknown>;
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
  const raw = await apiClient.post<PlaceBetResponseRaw>('/api/v1/bets', request);
  return normalizeSnakeCase(raw);
}

/**
 * Place a parlay bet
 */
export async function placeParlay(request: PlaceParlayRequest): Promise<PlaceParlayResponse> {
  const raw = await apiClient.post<PlaceParlayResponseRaw>('/api/v1/parlays', request);
  return normalizeSnakeCase(raw);
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
  return normalizeSnakeCase(raw);
}

/**
 * Get cashout offer for a bet
 */
export async function getCashoutOffer(betId: string): Promise<CashoutOffer> {
  const raw = await apiClient.get<CashoutOfferRaw>(`/api/v1/bets/${betId}/cashout-offer`);
  return normalizeSnakeCase(raw);
}

/**
 * Cash out a bet
 */
export async function cashoutBet(betId: string): Promise<CashoutResponse> {
  const raw = await apiClient.post<CashoutResponseRaw>(`/api/v1/bets/${betId}/cashout`);
  return normalizeSnakeCase(raw);
}

/**
 * Precheck bets before placement
 */
export async function precheckBets(request: PrecheckBetsRequest): Promise<PrecheckBetsResponse> {
  const raw = await apiClient.post<PrecheckBetsResponseRaw>('/api/v1/bets/precheck', request);
  return normalizeSnakeCase(raw);
}
