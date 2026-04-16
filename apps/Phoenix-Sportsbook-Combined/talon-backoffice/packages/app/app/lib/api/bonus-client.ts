import { apiClient } from "./client";

interface TimedCacheEntry<T> {
  data: T;
  ts: number;
}

export interface PlayerBonus {
  bonusId: number;
  campaignName: string;
  bonusType: string;
  status: string;
  grantedAmountCents: number;
  remainingAmountCents: number;
  wageringRequiredCents: number;
  wageringCompletedCents: number;
  wageringProgressPct: number;
  expiresAt: string;
  grantedAt: string;
}

export interface WalletBreakdown {
  realMoneyCents: number;
  bonusFundCents: number;
  totalCents: number;
  currency: string;
}

export interface WageringContribution {
  betId: string;
  betType: string;
  stakeCents: number;
  contributionCents: number;
  oddsDecimal: number;
  legCount: number;
  contributedAt: string;
}

export interface BonusProgress {
  bonusId: number;
  wageringRequiredCents: number;
  wageringCompletedCents: number;
  progressPct: number;
  recentContributions: WageringContribution[];
}

interface BonusListResponse {
  bonuses: PlayerBonus[];
}

interface BonusProgressResponse {
  bonusId: number;
  wageringRequiredCents: number;
  wageringCompletedCents: number;
  progressPct: number;
  recentContributions: WageringContribution[];
}

interface BreakdownResponse {
  realMoneyCents: number;
  bonusFundCents: number;
  totalCents: number;
  currency: string;
  activeBonusCount?: number;
}

const ACTIVE_CACHE_TTL_MS = 15_000;
const BREAKDOWN_CACHE_TTL_MS = 15_000;

let activeBonusesCache: {
  entry: TimedCacheEntry<PlayerBonus[]> | null;
  promise: Promise<PlayerBonus[]> | null;
} = { entry: null, promise: null };

const breakdownCache = new Map<
  string,
  {
    entry: TimedCacheEntry<WalletBreakdown> | null;
    promise: Promise<WalletBreakdown> | null;
  }
>();

function isFresh<T>(
  entry: TimedCacheEntry<T> | null,
  ttlMs: number,
): entry is TimedCacheEntry<T> {
  return entry !== null && Date.now() - entry.ts < ttlMs;
}

export async function getActiveBonuses(): Promise<PlayerBonus[]> {
  if (isFresh(activeBonusesCache.entry, ACTIVE_CACHE_TTL_MS)) {
    return activeBonusesCache.entry.data;
  }
  if (activeBonusesCache.promise) return activeBonusesCache.promise;

  const promise = apiClient
    .get<BonusListResponse>("/api/v1/bonuses/active")
    .then((res) => {
      const data = res.bonuses || [];
      activeBonusesCache.entry = { data, ts: Date.now() };
      activeBonusesCache.promise = null;
      return data;
    })
    .catch((err: unknown) => {
      activeBonusesCache.promise = null;
      throw err;
    });

  activeBonusesCache.promise = promise;
  return promise;
}

export async function claimBonus(
  campaignId: number,
  triggerReference?: string,
): Promise<PlayerBonus> {
  const body: Record<string, unknown> = { campaign_id: campaignId };
  if (triggerReference) body.trigger_reference = triggerReference;

  const result = await apiClient.post<PlayerBonus>(
    "/api/v1/bonuses/claim",
    body,
  );
  // Invalidate cache after claim
  activeBonusesCache.entry = null;
  return result;
}

export async function getBonusProgress(
  bonusId: number,
): Promise<BonusProgress> {
  return apiClient.get<BonusProgressResponse>(
    `/api/v1/bonuses/${bonusId}/progress`,
  );
}

export async function getWalletBreakdown(
  userId: string,
): Promise<WalletBreakdown> {
  const cached = breakdownCache.get(userId);
  if (cached && isFresh(cached.entry, BREAKDOWN_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) return cached.promise;

  const promise = apiClient
    .get<BreakdownResponse>(`/api/v1/wallet/${userId}/breakdown`)
    .then((res) => {
      const data: WalletBreakdown = {
        realMoneyCents: res.realMoneyCents,
        bonusFundCents: res.bonusFundCents,
        totalCents: res.totalCents,
        currency: res.currency || "USD",
      };
      breakdownCache.set(userId, {
        entry: { data, ts: Date.now() },
        promise: null,
      });
      return data;
    })
    .catch((err: unknown) => {
      breakdownCache.set(userId, { entry: null, promise: null });
      throw err;
    });

  breakdownCache.set(userId, { entry: cached?.entry ?? null, promise });
  return promise;
}

/** Invalidate all bonus caches (call after WebSocket bonus events). */
export function invalidateBonusCaches(): void {
  activeBonusesCache.entry = null;
  breakdownCache.clear();
}
