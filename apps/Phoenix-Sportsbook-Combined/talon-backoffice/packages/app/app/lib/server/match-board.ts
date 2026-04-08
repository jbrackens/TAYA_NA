import "server-only";

import { swarmQuery } from "../../api/bc/swarm";
import type {
  BoardEvent,
  LiveBoard,
  LiveBoardMatch,
  UpcomingBoard,
} from "../types/match-board";

interface TimedCacheEntry<T> {
  data: T;
  ts: number;
}

const BOARD_CACHE_TTL_MS = 15_000;
const liveBoardCache = new Map<
  number,
  { entry: TimedCacheEntry<LiveBoard> | null; promise: Promise<LiveBoard> | null }
>();
const upcomingBoardCache = new Map<
  number,
  { entry: TimedCacheEntry<UpcomingBoard> | null; promise: Promise<UpcomingBoard> | null }
>();

const SPORT_ALIAS_MAP: Record<string, string> = {
  Soccer: "soccer",
  Football: "soccer",
  Basketball: "basketball",
  Tennis: "tennis",
  IceHockey: "ice-hockey",
  Baseball: "baseball",
  AmericanFootball: "american-football",
  Cricket: "cricket",
  RugbyUnion: "rugby",
  RugbyLeague: "rugby",
  Volleyball: "volleyball",
  Mma: "mma",
  Boxing: "boxing",
};

function normalizeSportKey(alias: string): string {
  return SPORT_ALIAS_MAP[alias] || alias.toLowerCase().replace(/\s+/g, "-");
}

function getNumericScore(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isFresh<T>(
  entry: TimedCacheEntry<T> | null,
  ttlMs: number,
): entry is TimedCacheEntry<T> {
  return !!entry && Date.now() - entry.ts < ttlMs;
}

interface RawFlattenedGame {
  id: unknown;
  start_ts: unknown;
  team1_name: unknown;
  team2_name: unknown;
  markets_count: unknown;
  info?: Record<string, unknown>;
  sportName: string;
  sportAlias: string;
  competitionName: string;
}

function flattenGames(data: Record<string, unknown>): RawFlattenedGame[] {
  const games: RawFlattenedGame[] = [];
  const sportMap = data.sport as Record<string, Record<string, unknown>> | undefined;
  if (!sportMap) return games;

  for (const sport of Object.values(sportMap)) {
    const sportName = String(sport.name || "");
    const sportAlias = String(sport.alias || sportName);
    const regionMap = sport.region as Record<string, Record<string, unknown>> | undefined;
    if (!regionMap) continue;

    for (const region of Object.values(regionMap)) {
      const compMap = region.competition as Record<string, Record<string, unknown>> | undefined;
      if (!compMap) continue;

      for (const comp of Object.values(compMap)) {
        const competitionName = String(comp.name || "");
        const gameMap = comp.game as Record<string, Record<string, unknown>> | undefined;
        if (!gameMap) continue;

        for (const game of Object.values(gameMap)) {
          games.push({
            ...game,
            sportName,
            sportAlias,
            competitionName,
          });
        }
      }
    }
  }

  return games;
}

function toBoardEvent(
  game: RawFlattenedGame,
  status: "scheduled" | "in_play",
): BoardEvent {
  return {
    eventId: String(game.id),
    fixtureId: String(game.id),
    homeTeam: String(game.team1_name || "TBD"),
    awayTeam: String(game.team2_name || "TBD"),
    sportKey: normalizeSportKey(game.sportAlias),
    leagueKey: String(game.competitionName || ""),
    startTime: new Date(Number(game.start_ts || 0) * 1000).toISOString(),
    status,
    hasMarkets: Number(game.markets_count || 0) > 0,
  };
}

function toLiveBoardMatch(game: RawFlattenedGame): LiveBoardMatch {
  const info = (game.info || {}) as Record<string, unknown>;
  return {
    ...toBoardEvent(game, "in_play"),
    homeScore: getNumericScore(info.score1),
    awayScore: getNumericScore(info.score2),
    sportName: game.sportName,
  };
}

export async function loadLiveBoard(limitPerSport = 50): Promise<LiveBoard> {
  const cached = liveBoardCache.get(limitPerSport);
  if (cached && isFresh(cached.entry, BOARD_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    const data = (await swarmQuery({
      source: "betting",
      what: {
        sport: ["id", "name", "alias"],
        competition: ["id", "name"],
        region: ["id", "name"],
        game: [[
          "id",
          "start_ts",
          "team1_name",
          "team2_name",
          "type",
          "markets_count",
          "info",
        ]],
      },
      where: {
        game: { type: 1 },
      },
    })) as Record<string, unknown>;

    const grouped: LiveBoard = {};
    for (const game of flattenGames(data)) {
      const sportName = game.sportName;
      const current = grouped[sportName] || [];
      if (current.length >= limitPerSport) continue;
      current.push(toLiveBoardMatch(game));
      grouped[sportName] = current;
    }

    liveBoardCache.set(limitPerSport, {
      entry: { data: grouped, ts: Date.now() },
      promise: null,
    });
    return grouped;
  })();

  liveBoardCache.set(limitPerSport, {
    entry: cached?.entry || null,
    promise,
  });

  return promise;
}

export async function loadUpcomingBoard(limitPerSport = 10): Promise<UpcomingBoard> {
  const cached = upcomingBoardCache.get(limitPerSport);
  if (cached && isFresh(cached.entry, BOARD_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    const data = (await swarmQuery({
      source: "betting",
      what: {
        sport: ["id", "name", "alias"],
        competition: ["id", "name"],
        region: ["id", "name"],
        game: [[
          "id",
          "start_ts",
          "team1_name",
          "team2_name",
          "type",
          "markets_count",
        ]],
      },
      where: {
        game: { type: { "@in": [0, 2] } },
      },
    })) as Record<string, unknown>;

    const grouped: UpcomingBoard = {};
    const games = flattenGames(data).sort(
      (a, b) => Number(a.start_ts || 0) - Number(b.start_ts || 0),
    );

    for (const game of games) {
      const sportName = game.sportName;
      const current = grouped[sportName] || [];
      if (current.length >= limitPerSport) continue;
      current.push(toBoardEvent(game, "scheduled"));
      grouped[sportName] = current;
    }

    upcomingBoardCache.set(limitPerSport, {
      entry: { data: grouped, ts: Date.now() },
      promise: null,
    });
    return grouped;
  })();

  upcomingBoardCache.set(limitPerSport, {
    entry: cached?.entry || null,
    promise,
  });

  return promise;
}
