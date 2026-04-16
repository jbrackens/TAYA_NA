/**
 * BetConstruct client — browser-side.
 * Calls our Next.js API proxy routes at /api/bc/* which handle the
 * Swarm session management server-side (avoids CORS).
 */

import { logger } from "../logger";

interface TimedCacheEntry<T> {
  data: T;
  ts: number;
}

// ─── Types ──────────────────────────────────────────────────────
export interface BCSport {
  id: number;
  name: string;
  alias: string;
  order: number;
  gameCount: number;
}

export interface BCRegion {
  id: number;
  name: string;
  alias: string;
  order: number;
}

export interface BCCompetition {
  id: number;
  name: string;
  order: number;
  gameCount: number;
}

export interface BCGameMarketSelection {
  id: string;
  name: string;
  price: number;
  type: string;
  order: number;
}

export interface BCGameMarketSummary {
  id: string;
  type: string;
  name: string;
  displayKey: string;
  mainOrder: number;
  base: number | null;
  selections: BCGameMarketSelection[];
}

export interface BCGame {
  id: number;
  start_ts: number;
  team1_name: string;
  team2_name: string;
  type: number;
  markets_count: number;
  sportName?: string;
  sportAlias?: string;
  competitionName?: string;
  regionName?: string;
  markets?: BCGameMarketSummary[];
}

export interface BCGameSelection {
  id: string;
  name: string;
  price: number;
  type: string;
  order: number;
}

export interface BCGameMarket {
  id: string;
  type: string;
  name: string;
  displayKey: string;
  base: number | null;
  colCount: number;
  selections: BCGameSelection[];
}

export interface BCGameDetail {
  id: number;
  startTs: number;
  team1: string;
  team2: string;
  type: number;
  marketsCount: number;
  info: Record<string, unknown> | null;
  stats?: Record<string, unknown> | null;
  sportName: string;
  sportAlias: string;
  regionName: string;
  competitionName: string;
  markets: BCGameMarket[];
}

const BC_CACHE_TTL_MS = 30_000;
const sportsCache: {
  entry: TimedCacheEntry<BCSport[]> | null;
  promise: Promise<BCSport[]> | null;
} = { entry: null, promise: null };
const regionsCache = new Map<
  string,
  {
    entry: TimedCacheEntry<BCCompetition[]> | null;
    promise: Promise<BCCompetition[]> | null;
  }
>();
const gamesCache = new Map<
  string,
  { entry: TimedCacheEntry<BCGame[]> | null; promise: Promise<BCGame[]> | null }
>();
const gameDetailCache = new Map<
  string,
  {
    entry: TimedCacheEntry<BCGameDetail> | null;
    promise: Promise<BCGameDetail> | null;
  }
>();

function isFresh<T>(
  entry: TimedCacheEntry<T> | null,
  ttlMs: number,
): entry is TimedCacheEntry<T> {
  return !!entry && Date.now() - entry.ts < ttlMs;
}

// ─── Public API (calls local proxy) ─────────────────────────────

export async function bcGetSports(): Promise<BCSport[]> {
  if (isFresh(sportsCache.entry, BC_CACHE_TTL_MS)) {
    return sportsCache.entry.data;
  }
  if (sportsCache.promise) {
    return sportsCache.promise;
  }

  const promise = (async () => {
    const res = await fetch("/api/bc/sports/");
    if (!res.ok) throw new Error(`BC sports proxy error: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    logger.info("BetConstruct", "Loaded sports via proxy", data.length);
    sportsCache.entry = { data, ts: Date.now() };
    sportsCache.promise = null;
    return data;
  })();

  sportsCache.promise = promise;
  return promise;
}

export async function bcGetRegions(
  sportAlias: string,
): Promise<BCCompetition[]> {
  const cacheKey = sportAlias.toLowerCase();
  const cached = regionsCache.get(cacheKey);
  if (cached && isFresh(cached.entry, BC_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    const res = await fetch(
      `/api/bc/regions/?sport=${encodeURIComponent(sportAlias)}`,
    );
    if (!res.ok) throw new Error(`BC regions proxy error: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    regionsCache.set(cacheKey, {
      entry: { data, ts: Date.now() },
      promise: null,
    });
    return data;
  })();

  regionsCache.set(cacheKey, {
    entry: cached?.entry || null,
    promise,
  });
  return promise;
}

export async function bcGetCompetitions(
  sportAlias: string,
): Promise<BCCompetition[]> {
  return bcGetRegions(sportAlias);
}

export async function bcGetLiveGames(): Promise<BCGame[]> {
  const res = await fetch("/api/bc/live/");
  if (!res.ok) throw new Error(`BC live proxy error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function bcGetGames(
  sportAlias: string,
  competitionId?: string,
): Promise<BCGame[]> {
  const cacheKey = `${sportAlias.toLowerCase()}::${competitionId || "all"}`;
  const cached = gamesCache.get(cacheKey);
  if (cached && isFresh(cached.entry, BC_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  let url = `/api/bc/games/?sport=${encodeURIComponent(sportAlias)}`;
  if (competitionId) {
    url += `&competition=${encodeURIComponent(competitionId)}`;
  }

  const promise = (async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`BC games proxy error: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    gamesCache.set(cacheKey, {
      entry: { data, ts: Date.now() },
      promise: null,
    });
    return data;
  })();

  gamesCache.set(cacheKey, {
    entry: cached?.entry || null,
    promise,
  });
  return promise;
}

export async function bcGetGame(gameId: string): Promise<BCGameDetail> {
  const cached = gameDetailCache.get(gameId);
  if (cached && isFresh(cached.entry, BC_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    const res = await fetch(`/api/bc/game/?id=${encodeURIComponent(gameId)}`);
    if (!res.ok) throw new Error(`BC game proxy error: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    gameDetailCache.set(gameId, {
      entry: { data, ts: Date.now() },
      promise: null,
    });
    return data;
  })();

  gameDetailCache.set(gameId, {
    entry: cached?.entry || null,
    promise,
  });
  return promise;
}

export async function bcHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch("/api/bc/sports/");
    return res.ok;
  } catch {
    return false;
  }
}
