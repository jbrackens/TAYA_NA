/**
 * Live-moments client. This is intentionally separate from the tradable
 * discovery feed: live upstream event state informs the /live page only and
 * does not mutate market prices or settlement.
 */

import { apiClient } from "./client";

export type LiveMarketEvent = {
  id: string;
  source?: string;
  title?: string;
  sport?: string;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  status?: string;
  score?: string;
  detail?: string;
  period?: string;
  clock?: string;
  live: boolean;
  ended: boolean;
  updatedAt: string;
};

export type LiveProviderStatus = {
  key: string;
  label: string;
  state: string;
  lastConnectedAt?: string;
  lastMessageAt?: string;
  error?: string;
};

export type LiveMarketsResponse = {
  events: LiveMarketEvent[];
  providers: LiveProviderStatus[];
  generatedAt: string;
};

export async function getLiveMarkets(): Promise<LiveMarketsResponse> {
  const res = await apiClient.get<LiveMarketsResponse>("/api/v1/live-markets");
  return {
    events: Array.isArray(res?.events) ? res.events : [],
    providers: Array.isArray(res?.providers) ? res.providers : [],
    generatedAt: res?.generatedAt || new Date().toISOString(),
  };
}
