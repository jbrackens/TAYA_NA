import { apiClient } from "./client";

interface TimedCacheEntry<T> {
  data: T;
  ts: number;
}

export type LoyaltyTierCode = "bronze" | "silver" | "gold" | "vip" | "";

export interface LoyaltyAccount {
  accountId: string;
  playerId: string;
  currentTier: LoyaltyTierCode;
  nextTier: LoyaltyTierCode;
  pointsBalance: number;
  pointsEarnedLifetime: number;
  pointsEarned7D: number;
  pointsEarned30D: number;
  pointsEarnedCurrentMonth: number;
  pointsToNextTier: number;
  currentTierAssignedAt?: string;
  lastAccrualAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyLedgerEntry {
  entryId: string;
  accountId: string;
  playerId: string;
  entryType: string;
  entrySubtype?: string;
  sourceType: string;
  sourceId: string;
  pointsDelta: number;
  balanceAfter: number;
  metadata?: Record<string, string>;
  createdBy?: string;
  createdAt: string;
}

export interface LoyaltyTier {
  tierCode: LoyaltyTierCode;
  displayName: string;
  rank: number;
  minLifetimePoints: number;
  active: boolean;
}

interface LoyaltyLedgerResponseRaw {
  playerId: string;
  items: LoyaltyLedgerEntry[];
  total: number;
}

interface LoyaltyTiersResponseRaw {
  items: LoyaltyTier[];
  totalCount: number;
}

const ACCOUNT_CACHE_TTL_MS = 30_000;
const LEDGER_CACHE_TTL_MS = 15_000;
const TIERS_CACHE_TTL_MS = 60_000;

const accountCache = new Map<
  string,
  { entry: TimedCacheEntry<LoyaltyAccount> | null; promise: Promise<LoyaltyAccount> | null }
>();
const ledgerCache = new Map<
  string,
  { entry: TimedCacheEntry<LoyaltyLedgerEntry[]> | null; promise: Promise<LoyaltyLedgerEntry[]> | null }
>();
let tiersCache:
  | { entry: TimedCacheEntry<LoyaltyTier[]> | null; promise: Promise<LoyaltyTier[]> | null }
  | null = null;

function isFresh<T>(
  entry: TimedCacheEntry<T> | null,
  ttlMs: number,
): entry is TimedCacheEntry<T> {
  return !!entry && Date.now() - entry.ts < ttlMs;
}

export async function getLoyaltyAccount(userId: string): Promise<LoyaltyAccount> {
  const cached = accountCache.get(userId);
  if (cached && isFresh(cached.entry, ACCOUNT_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    const result = await apiClient.get<LoyaltyAccount>(`/api/v1/loyalty?userId=${encodeURIComponent(userId)}`);
    accountCache.set(userId, {
      entry: { data: result, ts: Date.now() },
      promise: null,
    });
    return result;
  })();

  accountCache.set(userId, {
    entry: cached?.entry || null,
    promise,
  });

  return promise;
}

export async function getLoyaltyLedger(
  userId: string,
  limit = 5,
): Promise<LoyaltyLedgerEntry[]> {
  const key = `${userId}:${limit}`;
  const cached = ledgerCache.get(key);
  if (cached && isFresh(cached.entry, LEDGER_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    const raw = await apiClient.get<LoyaltyLedgerResponseRaw>(
      `/api/v1/loyalty/ledger?userId=${encodeURIComponent(userId)}&limit=${limit}`,
    );
    ledgerCache.set(key, {
      entry: { data: raw.items || [], ts: Date.now() },
      promise: null,
    });
    return raw.items || [];
  })();

  ledgerCache.set(key, {
    entry: cached?.entry || null,
    promise,
  });

  return promise;
}

export async function getLoyaltyTiers(): Promise<LoyaltyTier[]> {
  if (tiersCache && isFresh(tiersCache.entry, TIERS_CACHE_TTL_MS)) {
    return tiersCache.entry.data;
  }
  if (tiersCache?.promise) {
    return tiersCache.promise;
  }

  const promise = (async () => {
    const raw = await apiClient.get<LoyaltyTiersResponseRaw>("/api/v1/loyalty/tiers");
    const items = raw.items || [];
    tiersCache = {
      entry: { data: items, ts: Date.now() },
      promise: null,
    };
    return items;
  })();

  tiersCache = {
    entry: tiersCache?.entry || null,
    promise,
  };

  return promise;
}
