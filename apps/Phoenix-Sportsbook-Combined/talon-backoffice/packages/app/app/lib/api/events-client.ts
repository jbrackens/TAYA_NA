import { apiClient } from './client';

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
 * Get all sports with event counts
 */
export async function getSports(): Promise<Sport[]> {
  const raw = await apiClient.get<SportRaw[]>('/api/v1/sports');
  return normalizeSnakeCase(raw);
}

/**
 * Get leagues for a specific sport
 */
export async function getLeagues(sportKey: string): Promise<League[]> {
  const raw = await apiClient.get<LeagueRaw[]>(`/api/v1/sports/${sportKey}/leagues`);
  return normalizeSnakeCase(raw);
}

/**
 * Get events with optional filtering and pagination
 */
export async function getEvents(params?: GetEventsParams): Promise<GetEventsPaginatedResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.sport) queryParams.sport = params.sport;
  if (params?.league) queryParams.league = params.league;
  if (params?.status) queryParams.status = params.status;
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);

  const raw = await apiClient.get<GetEventsPaginatedResponseRaw>(
    '/api/v1/events',
    queryParams
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
