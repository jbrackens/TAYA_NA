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

// Utility function to normalize snake_case to camelCase
function normalizeSnakeCase<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  if (Array.isArray(obj)) {
    return (obj.map(normalizeSnakeCase) as unknown) as Record<string, unknown>;
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

async function getBcAlias(normalizedKey: string): Promise<string> {
  if (bcAliasCache.size === 0) {
    // Cache empty — populate by loading sports first
    await getSports();
  }
  return bcAliasCache.get(normalizedKey) || normalizedKey;
}

/**
 * Get all sports with event counts.
 * Tries BetConstruct feed first, falls back to Go backend.
 */
export async function getSports(): Promise<Sport[]> {
  // Try BetConstruct feed first
  try {
    const bcSports = await bcGetSports();
    if (bcSports.length > 0) {
      logger.info(
        "Events",
        "Loaded sports from BetConstruct feed",
        bcSports.length,
      );
      return bcSports.map((s) => {
        const key = normalizeSportKey(s.alias || s.name);
        bcAliasCache.set(key, s.alias || s.name);
        return {
          sportId: String(s.id),
          sportName: s.name,
          sportKey: key,
          eventCount: s.gameCount,
        };
      });
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
  return normalizeSnakeCase(raw);
}

/**
 * Get leagues (regions + competitions) for a specific sport.
 * Tries BetConstruct feed first, falls back to Go backend.
 */
export async function getLeagues(sportKey: string): Promise<League[]> {
  // Reverse-map normalized key → BC alias (e.g. "basketball" → "Basketball")
  const bcAlias = await getBcAlias(sportKey);

  // Try BetConstruct — returns competitions as "leagues"
  try {
    const bcComps = await bcGetRegions(bcAlias);
    if (bcComps.length > 0) {
      return bcComps.map((c) => ({
        leagueId: String(c.id),
        leagueName: c.name,
        leagueKey: String(c.id),
        sportKey,
        eventCount: c.gameCount || 0,
      }));
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
    return normalizeSnakeCase(raw);
  } catch {
    return [];
  }
}

/**
 * Get events with optional filtering and pagination
 */
export async function getEvents(
  params?: GetEventsParams,
): Promise<GetEventsPaginatedResponse> {
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
        const events: Event[] = paged.map((g) => ({
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
        }));
        return {
          events,
          total: bcGames.length,
          page,
          limit,
          totalPages: Math.ceil(bcGames.length / limit),
        };
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
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);

  const raw = await apiClient.get<GetEventsPaginatedResponseRaw>(
    "/api/v1/events",
    queryParams,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Get a specific event by ID
 */
export async function getEvent(eventId: string): Promise<EventDetail> {
  const raw = await apiClient.get<EventDetailRaw>(`/api/v1/events/${eventId}`);
  return normalizeSnakeCase(raw);
}
