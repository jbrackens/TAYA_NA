import { apiClient } from './client';

interface TimedCacheEntry<T> {
  data: T;
  ts: number;
}

// Request types
export interface GetMarketsParams {
  fixture_id: string;
}

// Response types (Go API uses snake_case)
interface MarketSelectionRaw {
  selection_id: string;
  selection_name: string;
  odds: number;
  specifier?: string;
}

interface MarketRaw {
  market_id: string;
  fixture_id: string;
  market_name: string;
  market_key: string;
  status: string;
  selections: MarketSelectionRaw[];
  specifiers?: Record<string, string>;
  in_play: boolean;
  bet_count?: number;
  volume?: number;
}

// Normalized response types (camelCase)
export interface MarketSelection {
  selectionId: string;
  selectionName: string;
  odds: number;
  specifier?: string;
}

export interface Market {
  marketId: string;
  fixtureId: string;
  marketName: string;
  marketKey: string;
  status: string;
  selections: MarketSelection[];
  specifiers?: Record<string, string>;
  inPlay: boolean;
  betCount?: number;
  volume?: number;
}

const MARKETS_CACHE_TTL_MS = 30_000;
const fixtureMarketsCache = new Map<
  string,
  { entry: TimedCacheEntry<Market[]> | null; promise: Promise<Market[]> | null }
>();
const marketByIdCache = new Map<
  string,
  { entry: TimedCacheEntry<Market> | null; promise: Promise<Market> | null }
>();

function isFresh<T>(
  entry: TimedCacheEntry<T> | null,
  ttlMs: number,
): entry is TimedCacheEntry<T> {
  return !!entry && Date.now() - entry.ts < ttlMs;
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
 * Get all markets for a fixture
 */
export async function getMarkets(fixtureId: string): Promise<Market[]> {
  const cached = fixtureMarketsCache.get(fixtureId);
  if (cached && isFresh(cached.entry, MARKETS_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    const raw = await apiClient.get<MarketRaw[]>('/api/v1/markets', {
      fixture_id: fixtureId,
    });
    const result = normalizeSnakeCase(raw) as Market[];
    fixtureMarketsCache.set(fixtureId, {
      entry: { data: result, ts: Date.now() },
      promise: null,
    });
    return result;
  })();

  fixtureMarketsCache.set(fixtureId, {
    entry: cached?.entry || null,
    promise,
  });

  return promise;
}

/**
 * Get a specific market by ID
 */
export async function getMarket(marketId: string): Promise<Market> {
  const cached = marketByIdCache.get(marketId);
  if (cached && isFresh(cached.entry, MARKETS_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    const raw = await apiClient.get<MarketRaw>(`/api/v1/markets/${marketId}`);
    const result = normalizeSnakeCase(raw) as Market;
    marketByIdCache.set(marketId, {
      entry: { data: result, ts: Date.now() },
      promise: null,
    });
    return result;
  })();

  marketByIdCache.set(marketId, {
    entry: cached?.entry || null,
    promise,
  });

  return promise;
}
