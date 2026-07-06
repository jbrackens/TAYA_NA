import { apiClient } from "./client";

// Predict-native loyalty API shapes. Matches
// go-platform/.../internal/http/predict_loyalty_handlers.go. See
// PLAN-loyalty-leaderboards.md §2 for the semantic model.

export interface LoyaltyStanding {
  userId: string;
  pointsBalance: number;
  xp: number;
  xpPoints: number;
  rank: number; // 0..5; 0 is "hidden" (no pill)
  rankName: string;
  nextRank: number;
  nextRankName: string;
  xpToNextRank: number;
  unit: "PTS";
  lastActivity?: string;
}

export interface LoyaltyLedgerEntry {
  id: number;
  userId: string;
  eventType: "accrual" | "promotion" | "adjustment" | "migration";
  deltaPoints: number;
  balanceAfter: number;
  reason: string;
  marketId?: string;
  tradeId?: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface LoyaltyTier {
  rank: number;
  rankName: string;
  minXpPoints: number;
  unit: "PTS";
  benefits: string[] | null;
}

type RawLoyaltyStanding = Partial<LoyaltyStanding> & {
  tier?: number;
  tierName?: string;
  nextTier?: number;
  nextTierName?: string;
  pointsToNextTier?: number;
};

type RawLoyaltyTier = Partial<LoyaltyTier> & {
  tier?: number;
  name?: string;
  pointsThreshold?: number;
};

interface LedgerResponse {
  userId: string;
  items: LoyaltyLedgerEntry[];
  total: number;
}

interface TiersResponse {
  items: RawLoyaltyTier[];
  totalCount: number;
}

// Small in-memory TTL cache. The header tier pill + portfolio rank chip +
// /rewards all want the same standing — cache dedupes their fetches.
interface CacheEntry<T> {
  data: T;
  ts: number;
  promise: Promise<T> | null;
}

const STANDING_TTL_MS = 30_000;
const LEDGER_TTL_MS = 15_000;
const TIERS_TTL_MS = 300_000; // static data — long TTL is fine

let standingCache: CacheEntry<LoyaltyStanding> | null = null;
let tiersCache: CacheEntry<LoyaltyTier[]> | null = null;
const ledgerCache = new Map<string, CacheEntry<LoyaltyLedgerEntry[]>>();

function isFresh<T>(entry: CacheEntry<T> | null, ttlMs: number): boolean {
  return !!entry && Date.now() - entry.ts < ttlMs;
}

export async function getLoyaltyStanding(): Promise<LoyaltyStanding> {
  if (isFresh(standingCache, STANDING_TTL_MS)) {
    return standingCache!.data;
  }
  if (standingCache?.promise) return standingCache.promise;

  const promise = apiClient
    .get<RawLoyaltyStanding>("/api/v1/loyalty")
    .then((data) => {
      const normalized = normalizeLoyaltyStanding(data);
      standingCache = { data: normalized, ts: Date.now(), promise: null };
      return normalized;
    });
  standingCache = {
    data: standingCache?.data as LoyaltyStanding,
    ts: standingCache?.ts ?? 0,
    promise,
  };
  return promise;
}

export async function getLoyaltyLedger(
  limit = 20,
): Promise<LoyaltyLedgerEntry[]> {
  const key = String(limit);
  const cached = ledgerCache.get(key);
  if (cached && isFresh(cached, LEDGER_TTL_MS)) return cached.data;
  if (cached?.promise) return cached.promise;

  const promise = apiClient
    .get<LedgerResponse>(`/api/v1/loyalty/ledger?limit=${limit}`)
    .then((raw) => {
      const items = raw.items ?? [];
      ledgerCache.set(key, { data: items, ts: Date.now(), promise: null });
      return items;
    });
  ledgerCache.set(key, {
    data: cached?.data ?? [],
    ts: cached?.ts ?? 0,
    promise,
  });
  return promise;
}

export async function getLoyaltyTiers(): Promise<LoyaltyTier[]> {
  if (isFresh(tiersCache, TIERS_TTL_MS)) return tiersCache!.data;
  if (tiersCache?.promise) return tiersCache.promise;

  const promise = apiClient
    .get<TiersResponse>("/api/v1/loyalty/tiers")
    .then((raw) => {
      const items = (raw.items ?? []).map(normalizeLoyaltyTier);
      tiersCache = { data: items, ts: Date.now(), promise: null };
      return items;
    });
  tiersCache = {
    data: tiersCache?.data ?? [],
    ts: tiersCache?.ts ?? 0,
    promise,
  };
  return promise;
}

// Clears all caches. Call after actions that invalidate state (future:
// TierPromoted WebSocket event, user logout).
export function resetLoyaltyCaches(): void {
  standingCache = null;
  tiersCache = null;
  ledgerCache.clear();
}

function normalizeLoyaltyStanding(raw: RawLoyaltyStanding): LoyaltyStanding {
  const rank = raw.rank ?? raw.tier ?? 0;
  const rankName = raw.rankName ?? raw.tierName ?? "Hidden";
  const nextRank = raw.nextRank ?? raw.nextTier ?? 0;
  const nextRankName = raw.nextRankName ?? raw.nextTierName ?? "";
  const xpToNextRank = raw.xpToNextRank ?? raw.pointsToNextTier ?? 0;
  const pointsBalance = raw.pointsBalance ?? raw.xpPoints ?? raw.xp ?? 0;
  return {
    userId: raw.userId ?? "",
    pointsBalance,
    xp: raw.xp ?? pointsBalance,
    xpPoints: raw.xpPoints ?? pointsBalance,
    rank,
    rankName,
    nextRank,
    nextRankName,
    xpToNextRank,
    unit: "PTS",
    lastActivity: raw.lastActivity,
  };
}

function normalizeLoyaltyTier(raw: RawLoyaltyTier): LoyaltyTier {
  return {
    rank: raw.rank ?? raw.tier ?? 0,
    rankName: raw.rankName ?? raw.name ?? "Hidden",
    minXpPoints: raw.minXpPoints ?? raw.pointsThreshold ?? 0,
    unit: "PTS",
    benefits: raw.benefits ?? null,
  };
}
