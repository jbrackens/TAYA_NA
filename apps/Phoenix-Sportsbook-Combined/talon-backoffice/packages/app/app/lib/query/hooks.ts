'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSports, getLeagues, getEvents } from '../api/events-client';
import { getUserBets } from '../api/betting-client';
import { getLeaderboards } from '../api/leaderboards-client';
import type { Sport, League, Event, GetEventsPaginatedResponse } from '../api/events-client';
import type { UserBet } from '../api/betting-client';
import type { LeaderboardDefinition } from '../api/leaderboards-client';

// ─── Query Keys ─────────────────────────────────────────────
export const queryKeys = {
  sports: ['sports'] as const,
  leagues: (sportKey: string) => ['leagues', sportKey] as const,
  events: (sportKey?: string, leagueKey?: string) => ['events', sportKey, leagueKey] as const,
  userBets: (userId: string) => ['userBets', userId] as const,
  fixtures: ['fixtures'] as const,
  leaderboards: ['leaderboards'] as const,
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
  return useQuery<GetEventsPaginatedResponse>({
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

// ─── Fixtures (homepage feed) ───────────────────────────────
// Fetches from top sports via BetConstruct (no auth required, real odds).
// The old raw fetch to /api/v1/fixtures/ required Go auth and
// silently cached empty results on 401, breaking first-login UX.
async function fetchFixtures(): Promise<Event[]> {
  // Get the top 4 sports by game count, then fetch events from each
  const sports = await getSports();
  const topSports = sports
    .sort((a, b) => (b.eventCount || 0) - (a.eventCount || 0))
    .slice(0, 4);
  const batches = await Promise.all(
    topSports.map((s) =>
      getEvents({ sport: s.sportKey, limit: 5 })
        .then((r) => r.events)
        .catch(() => [] as Event[]),
    ),
  );
  return batches.flat();
}

export function useFixtures() {
  return useQuery<Event[]>({
    queryKey: queryKeys.fixtures,
    queryFn: fetchFixtures,
    staleTime: 30 * 1000, // fixtures change frequently
    retry: 2,
  });
}

// ─── Leaderboards ───────────────────────────────────────────
export function useLeaderboards() {
  return useQuery<LeaderboardDefinition[]>({
    queryKey: queryKeys.leaderboards,
    queryFn: () => getLeaderboards(),
    staleTime: 60 * 1000, // leaderboard list is fairly static
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
