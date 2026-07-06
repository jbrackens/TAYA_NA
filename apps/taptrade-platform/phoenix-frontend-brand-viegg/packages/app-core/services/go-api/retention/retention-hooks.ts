import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getFreebets,
  getOddsBoosts,
  acceptOddsBoost,
} from "./retention-client";
import type {
  GoFreebetsResponse,
  GoOddsBoostsResponse,
  GoAcceptOddsBoostResponse,
} from "./retention-types";
import type { AppError } from "../types";

/** Query keys for retention domain. */
export const retentionKeys = {
  all: ["retention"] as const,
  freebets: (userId: string, status?: string) =>
    ["retention", "freebets", userId, status] as const,
  oddsBoosts: (userId: string, status?: string) =>
    ["retention", "oddsBoosts", userId, status] as const,
};

/**
 * Fetch freebets for a user.
 * Stale time: 30 seconds.
 */
export function useFreebets(userId: string, status?: string) {
  return useQuery<GoFreebetsResponse, AppError>({
    queryKey: retentionKeys.freebets(userId, status),
    queryFn: () => getFreebets(userId, status),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch odds boosts for a user.
 * Stale time: 30 seconds.
 */
export function useOddsBoosts(userId: string, status?: string) {
  return useQuery<GoOddsBoostsResponse, AppError>({
    queryKey: retentionKeys.oddsBoosts(userId, status),
    queryFn: () => getOddsBoosts(userId, status),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/** Accept an odds boost. */
export function useAcceptOddsBoost() {
  return useMutation<
    GoAcceptOddsBoostResponse,
    AppError,
    { oddsBoostId: string; userId: string }
  >({
    mutationFn: ({ oddsBoostId, userId }) => acceptOddsBoost(oddsBoostId, userId),
  });
}
