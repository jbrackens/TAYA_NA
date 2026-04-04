/**
 * BetConstruct client — browser-side.
 * Calls our Next.js API proxy routes at /api/bc/* which handle the
 * Swarm session management server-side (avoids CORS).
 */

import { logger } from "../logger";

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
}

// ─── Public API (calls local proxy) ─────────────────────────────

export async function bcGetSports(): Promise<BCSport[]> {
  const res = await fetch("/api/bc/sports/");
  if (!res.ok) throw new Error(`BC sports proxy error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  logger.info("BetConstruct", "Loaded sports via proxy", data.length);
  return data;
}

export async function bcGetRegions(
  sportAlias: string,
): Promise<BCCompetition[]> {
  const res = await fetch(
    `/api/bc/regions/?sport=${encodeURIComponent(sportAlias)}`,
  );
  if (!res.ok) throw new Error(`BC regions proxy error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
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
  let url = `/api/bc/games/?sport=${encodeURIComponent(sportAlias)}`;
  if (competitionId) {
    url += `&competition=${encodeURIComponent(competitionId)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BC games proxy error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function bcHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch("/api/bc/sports/");
    return res.ok;
  } catch {
    return false;
  }
}
