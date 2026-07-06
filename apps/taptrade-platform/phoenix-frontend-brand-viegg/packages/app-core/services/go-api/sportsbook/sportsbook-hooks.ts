import { useQuery } from "@tanstack/react-query";
import { getMatchTracker, getFixtureStats } from "./sportsbook-client";
import type {
  GoMatchTrackerResponse,
  GoFixtureStatsResponse,
} from "./sportsbook-types";
import type { AppError } from "../types";

/** Query keys for sportsbook enrichment domain. */
export const sportsbookKeys = {
  matchTracker: (fixtureId: string) => ["matchTracker", fixtureId] as const,
  fixtureStats: (fixtureId: string) => ["fixtureStats", fixtureId] as const,
};

/**
 * Fetch match tracker timeline for a fixture.
 * Stale time: 30 seconds.
 */
export function useMatchTracker(fixtureId: string, enabled = true) {
  return useQuery<GoMatchTrackerResponse, AppError>({
    queryKey: sportsbookKeys.matchTracker(fixtureId),
    queryFn: () => getMatchTracker(fixtureId),
    enabled: enabled && !!fixtureId,
    staleTime: 30_000,
  });
}

/**
 * Fetch stats centre metrics for a fixture.
 * Stale time: 30 seconds.
 */
export function useFixtureStats(fixtureId: string, enabled = true) {
  return useQuery<GoFixtureStatsResponse, AppError>({
    queryKey: sportsbookKeys.fixtureStats(fixtureId),
    queryFn: () => getFixtureStats(fixtureId),
    enabled: enabled && !!fixtureId,
    staleTime: 30_000,
  });
}
