import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  placeBet,
  placeParlay,
  getUserBets,
  getBet,
  cashoutBet,
  getCashoutOffer,
} from "./betting-client";
import type {
  GoPlaceBetRequest,
  GoPlaceBetResponse,
  GoPlaceParlayRequest,
  GoPlaceParlayResponse,
  GoUserBetsQuery,
  GoUserBetsResponse,
  GoBetDetail,
  GoCashoutRequest,
  GoCashoutResponse,
  GoCashoutOffer,
} from "./betting-types";
import type { AppError } from "../types";
import { walletKeys } from "../wallet/wallet-hooks";

/** Query keys for betting domain. */
export const bettingKeys = {
  all: ["betting"] as const,
  userBets: (userId: string, query?: GoUserBetsQuery) =>
    ["betting", "userBets", userId, query] as const,
  detail: (betId: string) => ["betting", "detail", betId] as const,
  cashoutOffer: (betId: string) =>
    ["betting", "cashoutOffer", betId] as const,
};

/**
 * Place a single bet.
 * Invalidates wallet balance on success.
 */
export function usePlaceBet() {
  const queryClient = useQueryClient();
  return useMutation<GoPlaceBetResponse, AppError, GoPlaceBetRequest>({
    mutationFn: placeBet,
    onSuccess: () => {
      queryClient.invalidateQueries(walletKeys.all);
    },
  });
}

/**
 * Place a parlay (multi-leg) bet.
 * Invalidates wallet balance on success.
 */
export function usePlaceParlay() {
  const queryClient = useQueryClient();
  return useMutation<GoPlaceParlayResponse, AppError, GoPlaceParlayRequest>({
    mutationFn: placeParlay,
    onSuccess: () => {
      queryClient.invalidateQueries(walletKeys.all);
    },
  });
}

/**
 * Fetch a user's bets (open, settled, etc.).
 * Stale time: 30 seconds.
 */
export function useUserBets(
  userId: string,
  query?: GoUserBetsQuery,
  enabled = true,
) {
  return useQuery<GoUserBetsResponse, AppError>({
    queryKey: bettingKeys.userBets(userId, query),
    queryFn: () => getUserBets(userId, query),
    enabled: enabled && !!userId,
    staleTime: 30 * 1000,
    keepPreviousData: true,
  });
}

/**
 * Fetch a single bet by ID.
 * Stale time: 10 seconds.
 */
export function useBet(betId: string) {
  return useQuery<GoBetDetail, AppError>({
    queryKey: bettingKeys.detail(betId),
    queryFn: () => getBet(betId),
    enabled: !!betId,
    staleTime: 10 * 1000,
  });
}

/**
 * Cash out a bet.
 * Invalidates wallet balance and bet detail on success.
 */
export function useCashout(betId: string) {
  const queryClient = useQueryClient();
  return useMutation<GoCashoutResponse, AppError, GoCashoutRequest>({
    mutationFn: (request) => cashoutBet(betId, request),
    onSuccess: () => {
      queryClient.invalidateQueries(walletKeys.all);
      queryClient.invalidateQueries(bettingKeys.detail(betId));
    },
  });
}

/**
 * Fetch cashout offer for a bet.
 * Short stale time (5s) — offers expire quickly.
 */
export function useCashoutOffer(betId: string, enabled = true) {
  return useQuery<GoCashoutOffer, AppError>({
    queryKey: bettingKeys.cashoutOffer(betId),
    queryFn: () => getCashoutOffer(betId),
    enabled: enabled && !!betId,
    staleTime: 5 * 1000,
  });
}
