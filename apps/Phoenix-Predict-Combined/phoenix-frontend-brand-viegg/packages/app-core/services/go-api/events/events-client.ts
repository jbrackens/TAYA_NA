import { goApi } from "../client";
import type {
  GoSportsResponse,
  GoLeaguesResponse,
  GoEventsResponse,
  GoEvent,
  GoEventsQuery,
} from "./events-types";

function normalizeSportsResponse(data: GoSportsResponse): GoSportsResponse {
  return {
    ...data,
    sports: Array.isArray(data.sports) ? data.sports : Array.isArray(data.data) ? data.data : [],
  };
}

function normalizeEvent(data: GoEvent): GoEvent {
  return {
    ...data,
    start_time: data.start_time ?? data.scheduled_start ?? data.created_at,
  };
}

function normalizeEventsResponse(data: GoEventsResponse): GoEventsResponse {
  const events = Array.isArray(data.events) ? data.events : Array.isArray(data.data) ? data.data : [];
  return {
    ...data,
    events,
    page: data.page ?? data.pagination?.page ?? 1,
    limit: data.limit ?? data.pagination?.limit ?? events.length,
    total: data.total ?? data.pagination?.total ?? events.length,
  };
}

/** Fetch all available sports. */
export async function getSports(): Promise<GoSportsResponse> {
  const { data } = await goApi.get<GoSportsResponse>("/api/v1/sports");
  return normalizeSportsResponse(data);
}

/** Fetch leagues for a sport. */
export async function getLeagues(sport: string): Promise<GoLeaguesResponse> {
  const { data } = await goApi.get<GoLeaguesResponse>(
    `/api/v1/leagues/${encodeURIComponent(sport)}`,
  );
  return data;
}

/** Fetch paginated events list. */
export async function getEvents(
  query: GoEventsQuery,
): Promise<GoEventsResponse> {
  const { data } = await goApi.get<GoEventsResponse>("/api/v1/events", {
    params: query,
  });
  return normalizeEventsResponse(data);
}

/** Fetch a single event by ID. */
export async function getEvent(eventId: string): Promise<GoEvent> {
  const { data } = await goApi.get<GoEvent>(
    `/api/v1/events/${encodeURIComponent(eventId)}`,
  );
  return normalizeEvent(data);
}
