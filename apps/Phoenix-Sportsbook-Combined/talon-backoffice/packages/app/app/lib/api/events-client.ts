import { apiClient } from "./client";
import {
  bcGetSports,
  bcGetRegions,
  bcGetCompetitions,
  bcGetGames,
} from "./betconstruct-client";
import { logger } from "../logger";

// Request types
export interface GetEventsParams {
  sport?: string;
  league?: string;
  status?: string;
  query?: string;
  page?: number;
  limit?: number;
}

// Response types (Go API uses snake_case)
interface SportRaw {
  sport_id: string;
  sport_name: string;
  sport_key: string;
  event_count: number;
}

interface LeagueRaw {
  league_id: string;
  league_name: string;
  league_key: string;
  sport_key: string;
  event_count: number;
}

interface EventRaw {
  event_id: string;
  fixture_id: string;
  sport_id: string;
  league_id: string;
  home_team: string;
  away_team: string;
  sport_key: string;
  league_key: string;
  start_time: string;
  status: string;
  has_markets: boolean;
}

interface EventDetailRaw {
  event_id: string;
  fixture_id: string;
  sport_id: string;
  league_id: string;
  home_team: string;
  away_team: string;
  sport_key: string;
  league_key: string;
  start_time: string;
  status: string;
  updated_at: string;
  market_count: number;
  has_markets: boolean;
}

interface GetEventsPaginatedResponseRaw {
  events: EventRaw[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Normalized response types (camelCase)
export interface Sport {
  sportId: string;
  sportName: string;
  sportKey: string;
  eventCount: number;
}

export interface League {
  leagueId: string;
  leagueName: string;
  leagueKey: string;
  sportKey: string;
  eventCount: number;
}

export interface Event {
  eventId: string;
  fixtureId: string;
  sportId: string;
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  sportKey: string;
  leagueKey: string;
  startTime: string;
  status: string;
  hasMarkets: boolean;
}

export interface EventDetail {
  eventId: string;
  fixtureId: string;
  sportId: string;
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  sportKey: string;
  leagueKey: string;
  startTime: string;
  status: string;
  updatedAt: string;
  marketCount: number;
  hasMarkets: boolean;
}

export interface GetEventsPaginatedResponse {
  events: Event[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TimedCacheEntry<T> {
  data: T;
  ts: number;
}

// Utility function to normalize snake_case to camelCase
function normalizeSnakeCase<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  if (Array.isArray(obj)) {
    return obj.map(normalizeSnakeCase) as unknown as Record<string, unknown>;
  }
  if (obj !== null && typeof obj === "object") {
    return Object.entries(obj).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter: string) =>
          letter.toUpperCase(),
        );
        acc[camelKey] =
          typeof value === "object" && value !== null
            ? normalizeSnakeCase(value as Record<string, unknown>)
            : value;
        return acc;
      },
      {},
    );
  }
  return obj;
}

/**
 * Sport alias → normalized key mapping for sidebar icons
 */
const SPORT_ALIAS_MAP: Record<string, string> = {
  Soccer: "soccer",
  Football: "soccer",
  Basketball: "basketball",
  Tennis: "tennis",
  IceHockey: "ice-hockey",
  "Ice Hockey": "ice-hockey",
  Baseball: "baseball",
  AmericanFootball: "american-football",
  "American Football": "american-football",
  Cricket: "cricket",
  Rugby: "rugby",
  RugbyUnion: "rugby",
  RugbyLeague: "rugby",
  Golf: "golf",
  Boxing: "boxing",
  MMA: "mma",
  MixedMartialArts: "mma",
  Volleyball: "volleyball",
  Handball: "handball",
  TableTennis: "table-tennis",
  "Table Tennis": "table-tennis",
  Darts: "darts",
  Esports: "esports",
  EGames: "esports",
  ESports: "esports",
  CounterStrike: "cs2",
  CS2: "cs2",
  Dota2: "dota2",
  DotA2: "dota2",
  LeagueOfLegends: "lol",
  LoL: "lol",
  Cycling: "cycling",
  Swimming: "swimming",
  MotorSports: "racing",
  "Motor Sports": "racing",
};

function normalizeSportKey(alias: string): string {
  return SPORT_ALIAS_MAP[alias] || alias.toLowerCase().replace(/\s+/g, "-");
}

// Reverse map: normalized key → BC alias (populated when sports are loaded)
const bcAliasCache: Map<string, string> = new Map();
const SPORTS_CACHE_TTL_MS = 60_000;
const LEAGUES_CACHE_TTL_MS = 60_000;
const sportsCache: { entry: TimedCacheEntry<Sport[]> | null; promise: Promise<Sport[]> | null } = {
  entry: null,
  promise: null,
};
const leaguesCache = new Map<
  string,
  { entry: TimedCacheEntry<League[]> | null; promise: Promise<League[]> | null }
>();
const eventsCache = new Map<
  string,
  {
    entry: TimedCacheEntry<GetEventsPaginatedResponse> | null;
    promise: Promise<GetEventsPaginatedResponse> | null;
  }
>();
const eventDetailCache = new Map<
  string,
  {
    entry: TimedCacheEntry<EventDetail> | null;
    promise: Promise<EventDetail> | null;
  }
>();
const EVENTS_CACHE_TTL_MS = 15_000;
const EVENT_DETAIL_CACHE_TTL_MS = 30_000;

function isFresh<T>(
  entry: TimedCacheEntry<T> | null,
  ttlMs: number,
): entry is TimedCacheEntry<T> {
  return !!entry && Date.now() - entry.ts < ttlMs;
}

async function getBcAlias(normalizedKey: string): Promise<string> {
  if (bcAliasCache.size === 0) {
    // Cache empty — populate by loading sports first
    await getSports();
  }
  if (normalizedKey === "football") {
    return bcAliasCache.get("soccer") || "Soccer";
  }
  return bcAliasCache.get(normalizedKey) || normalizedKey;
}

/**
 * Philippine market sports whitelist.
 * BC aliases for the 15 most popular sports in the Philippines.
 * Sports not in this set are filtered out of the sidebar and landing page.
 */
const PH_SPORTS_WHITELIST = new Set([
  "Basketball",
  "Boxing",
  "Soccer",
  "Volleyball",
  "CounterStrike",
  "LeagueOfLegends",
  "Valorant",
  "Dota2",
  "Tennis",
  "Mma",
  "Baseball",
  "Badminton",
  "Motorsport",
  "Cricket",
  "IceHockey",
  "RugbyUnion",
  "RugbyLeague",
  "VirtualHorseRacing",
]);

/**
 * Get all sports with event counts.
 * Tries BetConstruct feed first, falls back to Go backend.
 * Filters to Philippine market sports only.
 */
export async function getSports(): Promise<Sport[]> {
  if (isFresh(sportsCache.entry, SPORTS_CACHE_TTL_MS)) {
    return sportsCache.entry.data;
  }

  if (sportsCache.promise) {
    return sportsCache.promise;
  }

  sportsCache.promise = (async () => {
  // Try BetConstruct feed first
    try {
      const bcSports = await bcGetSports();
      if (Array.isArray(bcSports) && bcSports.length > 0) {
        logger.info(
          "Events",
          "Loaded sports from BetConstruct feed",
          bcSports.length,
        );
        const mapped = bcSports
          .filter((s) => PH_SPORTS_WHITELIST.has(s.alias || s.name))
          .map((s) => {
            const key = normalizeSportKey(s.alias || s.name);
            bcAliasCache.set(key, s.alias || s.name);
            return {
              sportId: String(s.id),
              sportName: s.name,
              sportKey: key,
              eventCount: s.gameCount,
            };
          });
        sportsCache.entry = { data: mapped, ts: Date.now() };
        return mapped;
      }
    } catch (err) {
      logger.info(
        "Events",
        "BetConstruct feed unavailable, trying Go backend",
        err,
      );
    }

    // Fall back to Go backend
    const raw = await apiClient.get<SportRaw[]>("/api/v1/sports");
    const normalized = normalizeSnakeCase(raw);
    const result = Array.isArray(normalized) ? (normalized as Sport[]) : [];
    sportsCache.entry = { data: result, ts: Date.now() };
    return result;
  })();

  try {
    return await sportsCache.promise;
  } finally {
    sportsCache.promise = null;
  }
}

/**
 * Get leagues (regions + competitions) for a specific sport.
 * Tries BetConstruct feed first, falls back to Go backend.
 */
export async function getLeagues(sportKey: string): Promise<League[]> {
  const existing = leaguesCache.get(sportKey);
  if (existing && isFresh(existing.entry, LEAGUES_CACHE_TTL_MS)) {
    return existing.entry.data;
  }
  if (existing?.promise) {
    return existing.promise;
  }

  // Reverse-map normalized key → BC alias (e.g. "basketball" → "Basketball")
  const promise = (async () => {
    const bcAlias = await getBcAlias(sportKey);

    // Try BetConstruct — returns competitions as "leagues"
    try {
      const bcComps = await bcGetRegions(bcAlias);
      if (bcComps.length > 0) {
        const result = bcComps.map((c) => ({
          leagueId: String(c.id),
          leagueName: c.name,
          leagueKey: String(c.id),
          sportKey,
          eventCount: c.gameCount || 0,
        }));
        leaguesCache.set(sportKey, {
          entry: { data: result, ts: Date.now() },
          promise: null,
        });
        return result;
      }
    } catch (err) {
      logger.info(
        "Events",
        "BetConstruct regions unavailable, trying Go backend",
        err,
      );
    }

    // Fall back to Go backend
    try {
      const raw = await apiClient.get<LeagueRaw[]>(
        `/api/v1/sports/${sportKey}/leagues`,
      );
      const result = normalizeSnakeCase(raw) as League[];
      leaguesCache.set(sportKey, {
        entry: { data: result, ts: Date.now() },
        promise: null,
      });
      return result;
    } catch {
      leaguesCache.set(sportKey, {
        entry: { data: [], ts: Date.now() },
        promise: null,
      });
      return [];
    }
  })();

  leaguesCache.set(sportKey, {
    entry: existing?.entry || null,
    promise,
  });

  return promise;
}

/**
 * Get events with optional filtering and pagination
 */
export async function getEvents(
  params?: GetEventsParams,
): Promise<GetEventsPaginatedResponse> {
  const cacheKey = JSON.stringify({
    sport: params?.sport || "",
    league: params?.league || "",
    status: params?.status || "",
    query: params?.query || "",
    page: params?.page || 1,
    limit: params?.limit || 12,
  });
  const cached = eventsCache.get(cacheKey);
  if (cached && isFresh(cached.entry, EVENTS_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
  // Try BetConstruct first
    if (params?.sport) {
      try {
        const bcAlias = await getBcAlias(params.sport);
        const bcGames = await bcGetGames(bcAlias, params?.league);
        if (bcGames.length > 0) {
          const page = params?.page || 1;
          const limit = params?.limit || 12;
          const start = (page - 1) * limit;
          const paged = bcGames.slice(start, start + limit);
          const result: GetEventsPaginatedResponse = {
            events: paged.map((g) => ({
              eventId: String(g.id),
              fixtureId: String(g.id),
              sportId: "",
              leagueId: String((g as Record<string, unknown>).competitionId || ""),
              homeTeam: g.team1_name || "TBD",
              awayTeam: g.team2_name || "TBD",
              sportKey: params.sport || "",
              leagueKey: String((g as Record<string, unknown>).competitionId || ""),
              startTime: new Date(g.start_ts * 1000).toISOString(),
              status: g.type === 1 ? "in_play" : "scheduled",
              hasMarkets: (g.markets_count || 0) > 0,
            })),
            total: bcGames.length,
            page,
            limit,
            totalPages: Math.ceil(bcGames.length / limit),
          };
          eventsCache.set(cacheKey, {
            entry: { data: result, ts: Date.now() },
            promise: null,
          });
          return result;
        }
      } catch (err) {
        logger.info(
          "Events",
          "BetConstruct games unavailable, trying Go backend",
          err,
        );
      }
    }

    // Fall back to Go backend
    const queryParams: Record<string, string> = {};
    if (params?.sport) queryParams.sport = params.sport;
    if (params?.league) queryParams.league = params.league;
    if (params?.status) queryParams.status = params.status;
    if (params?.query) queryParams.query = params.query;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.limit) queryParams.limit = String(params.limit);

    const raw = await apiClient.get<GetEventsPaginatedResponseRaw>(
      "/api/v1/events",
      queryParams,
    );
    const result = normalizeSnakeCase(raw) as GetEventsPaginatedResponse;
    eventsCache.set(cacheKey, {
      entry: { data: result, ts: Date.now() },
      promise: null,
    });
    return result;
  })();

  eventsCache.set(cacheKey, {
    entry: cached?.entry || null,
    promise,
  });

  return promise;
}

/**
 * Get a specific event by ID
 */
export async function getEvent(eventId: string): Promise<EventDetail> {
  const cached = eventDetailCache.get(eventId);
  if (cached && isFresh(cached.entry, EVENT_DETAIL_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    const raw = await apiClient.get<EventDetailRaw>(`/api/v1/events/${eventId}`);
    const result = normalizeSnakeCase(raw) as EventDetail;
    eventDetailCache.set(eventId, {
      entry: { data: result, ts: Date.now() },
      promise: null,
    });
    return result;
  })();

  eventDetailCache.set(eventId, {
    entry: cached?.entry || null,
    promise,
  });

  return promise;
}
