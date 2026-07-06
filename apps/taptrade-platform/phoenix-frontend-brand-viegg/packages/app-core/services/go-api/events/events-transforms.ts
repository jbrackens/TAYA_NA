/**
 * Transform functions to map Go event/sport responses → existing frontend types.
 * This avoids rewriting every consumer component.
 */
import type { GoSport, GoEvent, GoEventsResponse } from "./events-types";
import type { SportsResponse, SportSummary, PaginatedResponse } from "../../../services/api/contracts";

function resolveSportLeagues(goSport: GoSport): string[] {
  return Array.isArray(goSport.leagues) ? goSport.leagues : [];
}

function resolveGoEvents(response: GoEventsResponse): GoEvent[] {
  if (Array.isArray(response.events)) {
    return response.events;
  }
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return [];
}

function resolveGoEventPagination(response: GoEventsResponse) {
  return {
    page: response.page ?? response.pagination?.page ?? 1,
    limit: response.limit ?? response.pagination?.limit ?? 20,
    total: response.total ?? response.pagination?.total ?? resolveGoEvents(response).length,
  };
}

function resolveGoScorePart(
  liveScore: GoEvent["live_score"] | undefined,
  result: GoEvent["result"] | undefined,
  liveKey: "home" | "away",
  resultKey: "home_score" | "away_score",
): number {
  const normalizedLiveScore =
    liveKey === "home" ? liveScore?.home ?? liveScore?.home_score : liveScore?.away ?? liveScore?.away_score;
  return normalizedLiveScore ?? result?.[resultKey] ?? 0;
}

function resolveGoEventStartTime(goEvent: GoEvent): string {
  return goEvent.start_time ?? goEvent.scheduled_start ?? goEvent.created_at;
}

function resolveCompetitorName(
  goEvent: GoEvent,
  side: "home" | "away",
): string {
  const explicitName = side === "home" ? goEvent.home_team : goEvent.away_team;
  if (explicitName && explicitName.trim() !== "") {
    return explicitName;
  }
  if (goEvent.name && goEvent.name.includes(" vs ")) {
    const [home, away] = goEvent.name.split(" vs ");
    return (side === "home" ? home : away) || (side === "home" ? "Home" : "Away");
  }
  return side === "home" ? "Home" : "Away";
}

/** Map a Go sport → existing SportSummary shape used by Redux sportSlice. */
export function transformGoSport(goSport: GoSport): SportSummary {
  const leagues = resolveSportLeagues(goSport);
  return {
    id: goSport.id,
    name: goSport.name,
    abbreviation: goSport.id,
    displayToPunters: true,
    tournaments: leagues.map((leagueName, index) => ({
      id: `${goSport.id}_league_${index}`,
      name: leagueName,
      numberOfFixtures: 0,
    })),
  };
}

/** Map Go sports response → existing SportsResponse array. */
export function transformGoSports(goSports: GoSport[] | undefined): SportsResponse {
  return Array.isArray(goSports) ? goSports.map(transformGoSport) : [];
}

/**
 * Map Go event → existing Fixture shape used by fixture-list and fixture page.
 * Returns a Fixture-compatible object. Markets are empty — they come from
 * a separate GET /api/v1/markets?event_id=X call.
 */
export function transformGoEvent(goEvent: GoEvent): Record<string, unknown> {
  const homeScore = resolveGoScorePart(goEvent.live_score, goEvent.result, "home", "home_score");
  const awayScore = resolveGoScorePart(goEvent.live_score, goEvent.result, "away", "away_score");
  const startTime = resolveGoEventStartTime(goEvent);
  const homeTeam = resolveCompetitorName(goEvent, "home");
  const awayTeam = resolveCompetitorName(goEvent, "away");
  const fixtureName =
    goEvent.home_team && goEvent.away_team
      ? `${goEvent.home_team} vs ${goEvent.away_team}`
      : goEvent.name || `${homeTeam} vs ${awayTeam}`;

  return {
    fixtureId: goEvent.event_id,
    fixtureName,
    startTime,
    status: mapGoStatusToFixtureStatus(goEvent.status),
    sport: {
      sportId: goEvent.sport,
      sportName: goEvent.sport,
      abbreviation: goEvent.sport,
    },
    score: {
      home: homeScore,
      away: awayScore,
    },
    competitors: {
      home: {
        competitorId: `${goEvent.event_id}_home`,
        name: homeTeam,
        abbreviation: homeTeam.substring(0, 3).toUpperCase(),
        qualifier: "home",
        score: homeScore,
      },
      away: {
        competitorId: `${goEvent.event_id}_away`,
        name: awayTeam,
        abbreviation: awayTeam.substring(0, 3).toUpperCase(),
        qualifier: "away",
        score: awayScore,
      },
    },
    tournament: {
      name: goEvent.league,
      sportId: goEvent.sport,
      startTime,
      tournamentId: goEvent.league,
    },
    markets: [],
    marketsTotalCount: 0,
  };
}

/** Map Go events paginated response → existing PaginatedResponse<Fixture>. */
export function transformGoEventsResponse(
  response: GoEventsResponse,
): PaginatedResponse<any> {
  const events = resolveGoEvents(response);
  const pagination = resolveGoEventPagination(response);
  return {
    data: events.map(transformGoEvent),
    totalCount: pagination.total,
    currentPage: pagination.page,
    itemsPerPage: pagination.limit,
    hasNextPage: pagination.page * pagination.limit < pagination.total,
  };
}

/**
 * Map Go event status strings → FixtureStatusEnum values used by frontend.
 * Go uses: "scheduled", "live", "completed", "cancelled", "postponed"
 * Frontend uses: "PRE_GAME", "IN_PLAY", "POST_GAME", "GAME_ABANDONED", etc.
 */
function mapGoStatusToFixtureStatus(goStatus: string): string {
  switch (goStatus.toLowerCase()) {
    case "live":
    case "in_play":
      return "IN_PLAY";
    case "scheduled":
    case "upcoming":
    case "pre_game":
      return "PRE_GAME";
    case "completed":
    case "finished":
    case "post_game":
      return "POST_GAME";
    case "cancelled":
    case "abandoned":
      return "GAME_ABANDONED";
    case "paused":
    case "break":
      return "BREAK_IN_PLAY";
    default:
      return goStatus.toUpperCase();
  }
}

/**
 * Map frontend fixture status filter → Go event status query param.
 * Frontend sends: "IN_PLAY", "UPCOMING", "FINISHED"
 * Go expects: "live", "scheduled", "completed"
 */
export function mapFixtureStatusToGoStatus(
  fixtureStatus: string | undefined,
): string | undefined {
  if (!fixtureStatus) return undefined;

  switch (fixtureStatus.toUpperCase()) {
    case "IN_PLAY":
      return "live";
    case "UPCOMING":
    case "PRE_GAME":
      return "scheduled";
    case "FINISHED":
    case "POST_GAME":
      return "completed";
    default:
      return fixtureStatus.toLowerCase();
  }
}
