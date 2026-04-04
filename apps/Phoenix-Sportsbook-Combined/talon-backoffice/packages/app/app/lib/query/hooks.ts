'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSports, getLeagues, getEvents } from '../api/events-client';
import { getUserBets } from '../api/betting-client';
import type { Sport, League } from '../api/events-client';
import type { UserBet } from '../api/betting-client';

// ─── Query Keys ─────────────────────────────────────────────
export const queryKeys = {
  sports: ['sports'] as const,
  leagues: (sportKey: string) => ['leagues', sportKey] as const,
  events: (sportKey?: string, leagueKey?: string) => ['events', sportKey, leagueKey] as const,
  userBets: (userId: string) => ['userBets', userId] as const,
};

// ─── Sports ─────────────────────────────────────────────────
export function useSports() {
  return useQuery<Sport[]>({
    queryKey: queryKeys.sports,
    queryFn: () => getSports(),
    staleTime: 60 * 1000, // sports list is fairly static
  });
}

// ─── Leagues for a Sport ────────────────────────────────────
export function useLeagues(sportKey: string, enabled = true) {
  return useQuery<League[]>({
    queryKey: queryKeys.leagues(sportKey),
    queryFn: () => getLeagues(sportKey),
    enabled: !!sportKey && enabled,
  });
}

// ─── Events ─────────────────────────────────────────────────
export function useEvents(sportKey?: string, leagueKey?: string) {
  return useQuery<any>({
    queryKey: queryKeys.events(sportKey, leagueKey),
    queryFn: () => getEvents({ sport: sportKey, league: leagueKey }),
    staleTime: 30 * 1000, // events change frequently
  });
}

// ─── User Bets ──────────────────────────────────────────────
export function useUserBets(userId: string, enabled = true) {
  return useQuery<UserBet[]>({
    queryKey: queryKeys.userBets(userId),
    queryFn: () => getUserBets(userId),
    enabled: !!userId && enabled,
    staleTime: 10 * 1000,
  });
}

// ─── Invalidation helpers ───────────────────────────────────
export function useInvalidateSports() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.sports });
}

export function useInvalidateUserBets(userId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.userBets(userId) });
}
