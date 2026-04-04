import { NextResponse } from "next/server";
import { swarmQuery } from "../swarm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await swarmQuery({
      source: "betting",
      what: {
        sport: ["id", "name", "alias"],
        competition: ["id", "name"],
        region: ["id", "name"],
        game: [
          [
            "id",
            "start_ts",
            "team1_name",
            "team2_name",
            "type",
            "markets_count",
            "info",
          ],
        ],
      },
      where: {
        game: { type: 1 },
      },
    });

    // Flatten nested sport > region > competition > game structure
    const games: Record<string, unknown>[] = [];
    const sportMap = (data as Record<string, unknown>).sport as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!sportMap) return NextResponse.json([]);

    for (const sport of Object.values(sportMap)) {
      const sportName = sport.name as string;
      const sportAlias = sport.alias as string;
      const regionMap = sport.region as
        | Record<string, Record<string, unknown>>
        | undefined;
      if (!regionMap) continue;

      for (const region of Object.values(regionMap)) {
        const regionName = region.name as string;
        const compMap = region.competition as
          | Record<string, Record<string, unknown>>
          | undefined;
        if (!compMap) continue;

        for (const comp of Object.values(compMap)) {
          const compName = comp.name as string;
          const gameMap = comp.game as
            | Record<string, Record<string, unknown>>
            | undefined;
          if (!gameMap) continue;

          for (const g of Object.values(gameMap)) {
            games.push({
              ...g,
              sportName,
              sportAlias,
              regionName,
              competitionName: compName,
            });
          }
        }
      }
    }

    return NextResponse.json(games);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
