/**
 * Discover-feed client. Talks to GET /api/v1/discover on the Go gateway.
 *
 * The endpoint serves a catalog of markets sorted by volume desc with
 * cursor-based pagination. It is the *only* contract clients see for this
 * data — never reach past it. Source identity (which upstream venue a
 * given market originated from) is internal-only and stays server-side.
 */

import { apiClient } from "./client";

export type Market = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  end_time: string | null;
  volume: number;
  outcomes: string[];
  prices: number[];
};

export type DiscoverResponse = {
  markets: Market[];
  next_cursor: string | null;
};

export type DiscoverParams = {
  q?: string;
  limit?: number;
  cursor?: string;
};

export async function getDiscover(
  params: DiscoverParams = {},
): Promise<DiscoverResponse> {
  const search: Record<string, string> = {};
  if (params.q && params.q.trim()) search.q = params.q.trim();
  if (params.limit) search.limit = String(params.limit);
  if (params.cursor) search.cursor = params.cursor;

  const res = await apiClient.get<DiscoverResponse>(
    "/api/v1/discover",
    Object.keys(search).length ? search : undefined,
  );

  return {
    markets: Array.isArray(res?.markets) ? res.markets : [],
    next_cursor: res?.next_cursor || null,
  };
}
