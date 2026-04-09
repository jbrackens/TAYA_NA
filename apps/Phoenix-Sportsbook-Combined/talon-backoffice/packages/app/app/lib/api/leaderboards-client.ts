import { apiClient } from './client';

export type LeaderboardRankingMode = 'sum' | 'min' | 'max';
export type LeaderboardOrder = 'asc' | 'desc';
export type LeaderboardStatus = 'draft' | 'active' | 'closed';

export interface LeaderboardDefinition {
  leaderboardId: string;
  slug?: string;
  name: string;
  description?: string;
  metricKey: string;
  eventType?: string;
  rankingMode: LeaderboardRankingMode;
  order: LeaderboardOrder;
  status: LeaderboardStatus;
  currency?: string;
  prizeSummary?: string;
  windowStartsAt?: string;
  windowEndsAt?: string;
  lastComputedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardStanding {
  leaderboardId: string;
  playerId: string;
  rank: number;
  score: number;
  eventCount: number;
  lastEventAt?: string;
}

export async function getLeaderboards(search?: string): Promise<LeaderboardDefinition[]> {
  const params = new URLSearchParams();
  if (search?.trim()) params.set('search', search.trim());
  const query = params.toString();
  const response = await apiClient.get<{ items?: LeaderboardDefinition[] }>(
    `/api/v1/leaderboards${query ? `?${query}` : ''}`,
  );
  return Array.isArray(response?.items) ? response.items : [];
}

export async function getLeaderboard(id: string): Promise<{
  leaderboard: LeaderboardDefinition;
  topEntries: LeaderboardStanding[];
  viewerEntry?: LeaderboardStanding | null;
}> {
  return getLeaderboardForUser(id);
}

export async function getLeaderboardForUser(
  id: string,
  userId?: string,
): Promise<{
  leaderboard: LeaderboardDefinition;
  topEntries: LeaderboardStanding[];
  viewerEntry?: LeaderboardStanding | null;
}> {
  const params = new URLSearchParams();
  if (userId?.trim()) params.set('userId', userId.trim());
  const query = params.toString();
  return apiClient.get(`/api/v1/leaderboards/${encodeURIComponent(id)}${query ? `?${query}` : ''}`);
}

export async function getLeaderboardEntries(
  id: string,
  limit = 50,
  offset = 0,
  userId?: string,
): Promise<{
  leaderboard: LeaderboardDefinition;
  items: LeaderboardStanding[];
  totalCount: number;
  limit: number;
  offset: number;
  viewerEntry?: LeaderboardStanding | null;
}> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (userId?.trim()) {
    params.set('userId', userId.trim());
  }
  return apiClient.get(`/api/v1/leaderboards/${encodeURIComponent(id)}/entries?${params.toString()}`);
}
