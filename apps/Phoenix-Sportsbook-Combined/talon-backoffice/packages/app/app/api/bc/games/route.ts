import { NextRequest, NextResponse } from "next/server";
import { swarmQuery } from "../swarm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sportAlias = request.nextUrl.searchParams.get("sport");
  const competitionId = request.nextUrl.searchParams.get("competition");

  if (!sportAlias) {
    return NextResponse.json({ error: "Missing sport param" }, { status: 400 });
  }

  try {
    const where: Record<string, unknown> = {
      sport: { alias: sportAlias },
      game: { type: { "@in": [0, 2] } },
    };

    if (competitionId) {
      where.competition = { id: Number(competitionId) };
    }

    const data = await swarmQuery({
      source: "betting",
      what: {
        game: [
          "id",
          "start_ts",
          "team1_name",
          "team2_name",
          "type",
          "markets_count",
        ],
        competition: ["id", "name"],
      },
      where,
    });

    const raw = data as Record<string, unknown>;
    const games: Array<Record<string, unknown>> = [];

    // Helper: extract games from a competition map
    function extractFromCompMap(
      compMap: Record<string, Record<string, unknown>>,
    ) {
      for (const [compId, comp] of Object.entries(compMap)) {
        const gameMap = comp.game as
          | Record<string, Record<string, unknown>>
          | undefined;
        if (!gameMap || typeof gameMap !== "object") continue;
        for (const game of Object.values(gameMap)) {
          games.push({
            id: game.id,
            start_ts: game.start_ts,
            team1_name: game.team1_name,
            team2_name: game.team2_name,
            type: game.type,
            markets_count: game.markets_count,
            competitionId: compId,
            competitionName: comp.name,
          });
        }
      }
    }

    // Swarm response varies by filter:
    // - With competition filter: competition > game (top level)
    // - Without competition: region > competition > game
    const topCompMap = raw.competition as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (topCompMap) {
      extractFromCompMap(topCompMap);
    }

    const regionMap = raw.region as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (regionMap) {
      for (const region of Object.values(regionMap)) {
        const compMap = region.competition as
          | Record<string, Record<string, unknown>>
          | undefined;
        if (compMap) extractFromCompMap(compMap);
      }
    }

    // Sort by start time
    games.sort((a, b) => (a.start_ts as number) - (b.start_ts as number));

    return NextResponse.json(games);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
