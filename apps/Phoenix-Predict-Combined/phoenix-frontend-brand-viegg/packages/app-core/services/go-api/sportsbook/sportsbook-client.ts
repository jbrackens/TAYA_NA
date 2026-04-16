import { goApi } from "../client";
import type {
  GoMatchTrackerResponse,
  GoFixtureStatsResponse,
} from "./sportsbook-types";

/** Fetch match tracker timeline for a fixture. */
export async function getMatchTracker(
  fixtureId: string,
): Promise<GoMatchTrackerResponse> {
  const { data } = await goApi.get<GoMatchTrackerResponse>(
    `/api/v1/match-tracker/fixtures/${encodeURIComponent(fixtureId)}`,
  );
  return data;
}

/** Fetch stats centre metrics for a fixture. */
export async function getFixtureStats(
  fixtureId: string,
): Promise<GoFixtureStatsResponse> {
  const { data } = await goApi.get<GoFixtureStatsResponse>(
    `/api/v1/stats/fixtures/${encodeURIComponent(fixtureId)}`,
  );
  return data;
}
