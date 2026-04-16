import { useQuery } from "@tanstack/react-query";
import { getMarkets, getMarket } from "./markets-client";
import type {
  GoMarketsResponse,
  GoMarket,
  GoMarketsQuery,
} from "./markets-types";
import type { AppError } from "../types";

/** Query keys for markets domain. */
export const marketsKeys = {
  all: ["markets"] as const,
  list: (query: GoMarketsQuery) => ["markets", "list", query] as const,
  detail: (marketId: string) => ["markets", "detail", marketId] as const,
};

/**
 * Fetch markets by event_id or other filters.
 * Stale time: 15 seconds (odds change rapidly for live events).
 */
export function useMarkets(query: GoMarketsQuery, enabled = true) {
  return useQuery<GoMarketsResponse, AppError>({
    queryKey: marketsKeys.list(query),
    queryFn: () => getMarkets(query),
    enabled: enabled && !!query.event_id,
    staleTime: 15 * 1000,
    keepPreviousData: true,
  });
}

/**
 * Fetch a single market by ID.
 * Stale time: 10 seconds.
 */
export function useMarket(marketId: string) {
  return useQuery<GoMarket, AppError>({
    queryKey: marketsKeys.detail(marketId),
    queryFn: () => getMarket(marketId),
    enabled: !!marketId,
    staleTime: 10 * 1000,
  });
}
