import { apiClient } from "./client";

// Predict-native loyalty API shapes. Matches
// go-platform/.../internal/http/predict_loyalty_handlers.go. See
// PLAN-loyalty-leaderboards.md §2 for the semantic model.

export interface LoyaltyStanding {
  userId: string;
  pointsBalance: number;
  tier: number; // 0..5; 0 is "hidden" (no pill)
  tierName: string;
  nextTier: number;
  nextTierName: string;
  pointsToNextTier: number;
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
  tier: number;
  name: string;
  pointsThreshold: number;
  benefits: string[] | null;
}

interface LedgerResponse {
  userId: string;
  items: LoyaltyLedgerEntry[];
  total: number;
}

interface TiersResponse {
  items: LoyaltyTier[];
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
    .get<LoyaltyStanding>("/api/v1/loyalty")
    .then((data) => {
      standingCache = { data, ts: Date.now(), promise: null };
      return data;
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
      const items = raw.items ?? [];
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
