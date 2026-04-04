/** Go phoenix-events service response types. */

/** GET /api/v1/sports response. */
export interface GoSportsResponse {
  sports?: GoSport[];
  data?: GoSport[];
}

export interface GoSport {
  id: string;
  name: string;
  leagues?: string[];
  events_count?: number;
}

/** GET /api/v1/leagues/{sport} response. */
export interface GoLeaguesResponse {
  sport: string;
  leagues: GoLeague[];
}

export interface GoLeague {
  name: string;
  country: string;
  events_count: number;
}

/** GET /api/v1/events response (paginated). */
export interface GoEventsPagination {
  page?: number;
  limit?: number;
  total?: number;
}

export interface GoEventsResponse {
  events?: GoEvent[];
  data?: GoEvent[];
  total?: number;
  page?: number;
  limit?: number;
  pagination?: GoEventsPagination;
}

/** GET /api/v1/events/{event_id} response. */
export interface GoEvent {
  event_id: string;
  external_event_id?: string;
  name?: string;
  sport: string;
  league: string;
  home_team?: string;
  away_team?: string;
  start_time?: string;
  scheduled_start?: string;
  venue?: string;
  status: string;
  live_score?: GoLiveScore;
  result?: GoEventResult;
  created_at: string;
  updated_at: string;
}

export interface GoLiveScore {
  home?: number;
  away?: number;
  home_score?: number;
  away_score?: number;
  period?: string;
  clock?: number;
  last_updated?: string;
  last_update?: string;
}

export interface GoEventResult {
  outcome?: string;
  home_score: number;
  away_score: number;
  winner?: string;
  completed_at?: string;
}

/** Query parameters for GET /api/v1/events. */
export interface GoEventsQuery {
  sport?: string;
  league?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}
