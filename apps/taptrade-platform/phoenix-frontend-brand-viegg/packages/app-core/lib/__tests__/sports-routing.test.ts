import {
  buildLegacyMatchPath,
  buildSportsLeaguePath,
  buildSportsMatchPath,
  buildSportsSportPath,
  isSportsRoutePath,
  resolveEventRouteKey,
  resolveLeagueRouteKey,
  resolveSportRouteKey,
} from "../sports-routing";

describe("sports routing helpers", () => {
  test("resolves sport key with backward-compatible query priority", () => {
    expect(
      resolveSportRouteKey({
        gameFilter: "mlb",
        sportKey: "nfl",
      }),
    ).toBe("mlb");
    expect(
      resolveSportRouteKey({
        sportKey: "NBA",
      }),
    ).toBe("nba");
    expect(
      resolveSportRouteKey({
        sport: "UFC",
      }),
    ).toBe("ufc");
  });

  test("resolves league and event aliases", () => {
    expect(resolveLeagueRouteKey({ competitionId: "league-1" })).toBe(
      "league-1",
    );
    expect(resolveLeagueRouteKey({ leagueKey: "league-2" })).toBe("league-2");
    expect(resolveEventRouteKey({ fixtureId: "fixture-1" })).toBe("fixture-1");
    expect(resolveEventRouteKey({ eventKey: "fixture-2" })).toBe("fixture-2");
  });

  test("builds native and legacy sportsbook paths", () => {
    expect(buildSportsSportPath("mlb")).toBe("/sports/mlb");
    expect(buildSportsLeaguePath("mlb", "league:123")).toBe(
      "/sports/mlb/league%3A123",
    );
    expect(buildSportsMatchPath("mlb", "league:123", "f:abc")).toBe(
      "/sports/mlb/league%3A123/match/f%3Aabc",
    );
    expect(buildLegacyMatchPath("mlb", "f:abc")).toBe(
      "/esports-bets/mlb/match/f%3Aabc",
    );
  });

  test("detects sports route paths", () => {
    expect(isSportsRoutePath("/sports/[sportKey]")).toBe(true);
    expect(isSportsRoutePath("/esports-bets/[gameFilter]")).toBe(false);
  });
});

