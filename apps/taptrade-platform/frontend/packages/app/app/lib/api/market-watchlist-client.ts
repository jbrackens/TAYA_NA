import { apiClient } from "./client";

interface WatchlistResponse {
  items: string[];
  total: number;
}

interface WatchlistMutationResponse {
  marketId: string;
  watched: boolean;
}

export async function getMarketWatchlist(): Promise<string[]> {
  const raw = await apiClient.get<WatchlistResponse>(
    "/api/v1/watchlist/markets",
  );
  return raw.items;
}

export async function addMarketToWatchlist(
  marketId: string,
): Promise<WatchlistMutationResponse> {
  return apiClient.put<WatchlistMutationResponse>(
    `/api/v1/watchlist/markets/${encodeURIComponent(marketId)}`,
  );
}

export async function removeMarketFromWatchlist(
  marketId: string,
): Promise<WatchlistMutationResponse> {
  return apiClient.delete<WatchlistMutationResponse>(
    `/api/v1/watchlist/markets/${encodeURIComponent(marketId)}`,
  );
}
