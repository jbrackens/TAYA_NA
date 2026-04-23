import { apiClient } from "./client";

// Predict-native leaderboard API shapes. Matches
// go-platform/.../internal/http/predict_leaderboard_handlers.go. See
// PLAN-loyalty-leaderboards.md §2.Leaderboards for the semantic model.

export type PredictBoardWindow = "rolling_30d" | "weekly";

export interface LeaderboardDefinition {
  id: string;
  name: string;
  description: string;
  metricLabel: string;
  window: PredictBoardWindow;
  minSettled: number;
  minVolumeCents?: number;
  categorySlug?: string;
  qualificationMsg: string;
}

export interface LeaderboardEntry {
  boardId: string;
  rank: number;
  userId: string;
  displayName: string;
  metricValue: number;
  windowStart: string;
  windowEnd: string;
}

interface BoardsResponse {
  items: LeaderboardDefinition[];
  totalCount: number;
}

interface EntriesResponse {
  boardId: string;
  items: LeaderboardEntry[];
  totalCount: number;
  limit: number;
  viewerEntry?: LeaderboardEntry | null;
}

interface StandingResponse {
  userId: string;
  items: LeaderboardEntry[];
  totalCount: number;
}

export async function getLeaderboards(): Promise<LeaderboardDefinition[]> {
  const raw = await apiClient.get<BoardsResponse>("/api/v1/leaderboards");
  return raw.items ?? [];
}

export async function getLeaderboardEntries(
  boardId: string,
  limit = 25,
): Promise<EntriesResponse> {
  return apiClient.get<EntriesResponse>(
    `/api/v1/leaderboards/${encodeURIComponent(boardId)}/entries?limit=${limit}`,
  );
}

// getUserStanding returns every board the session user currently qualifies
// for, best rank first. Drives the portfolio rank chip + the
// /leaderboards sidebar "my standings" summary. Path sits under /api/v1/me/
// (not /leaderboards/) so the leaderboard list + entries can be public while
// this endpoint stays auth-gated.
export async function getUserStanding(): Promise<LeaderboardEntry[]> {
  const raw = await apiClient.get<StandingResponse>("/api/v1/me/leaderboards");
  return raw.items ?? [];
}
