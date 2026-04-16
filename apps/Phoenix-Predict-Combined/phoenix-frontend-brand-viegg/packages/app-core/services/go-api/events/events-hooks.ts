import { useQuery } from "@tanstack/react-query";
import { getSports, getLeagues, getEvents, getEvent } from "./events-client";
import type {
  GoSportsResponse,
  GoLeaguesResponse,
  GoEventsResponse,
  GoEvent,
  GoEventsQuery,
} from "./events-types";
import type { AppError } from "../types";

/** Query keys for events domain. */
export const eventsKeys = {
  all: ["events"] as const,
  sports: () => ["events", "sports"] as const,
  leagues: (sport: string) => ["events", "leagues", sport] as const,
  list: (query: GoEventsQuery) => ["events", "list", query] as const,
  detail: (eventId: string) => ["events", "detail", eventId] as const,
};

/**
 * Fetch all available sports.
 * Stale time: 5 minutes (sports list rarely changes).
 */
export function useSports() {
  return useQuery<GoSportsResponse, AppError>({
    queryKey: eventsKeys.sports(),
    queryFn: getSports,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch leagues for a sport.
 * Stale time: 5 minutes.
 */
export function useLeagues(sport: string) {
  return useQuery<GoLeaguesResponse, AppError>({
    queryKey: eventsKeys.leagues(sport),
    queryFn: () => getLeagues(sport),
    enabled: !!sport,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch paginated events list.
 * Stale time: 30 seconds (events change frequently with live status).
 */
export function useEvents(query: GoEventsQuery, enabled = true) {
  return useQuery<GoEventsResponse, AppError>({
    queryKey: eventsKeys.list(query),
    queryFn: () => getEvents(query),
    enabled,
    staleTime: 30 * 1000,
    keepPreviousData: true,
  });
}

/**
 * Fetch a single event by ID.
 * Stale time: 15 seconds (live events need fresh data).
 */
export function useEvent(eventId: string) {
  return useQuery<GoEvent, AppError>({
    queryKey: eventsKeys.detail(eventId),
    queryFn: () => getEvent(eventId),
    enabled: !!eventId,
    staleTime: 15 * 1000,
  });
}
