import { NextResponse } from "next/server";
import { swarmQuery } from "../swarm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await swarmQuery({
      source: "betting",
      what: {
        sport: ["id", "name", "alias", "order"],
        game: "@count",
      },
      where: {
        game: { type: { "@in": [0, 2] } },
      },
    });

    const raw = data as Record<string, unknown>;
    const sportMap = raw.sport as
      | Record<string, Record<string, unknown>>
      | undefined;
    const regionMap = raw.region as
      | Record<string, Record<string, unknown>>
      | undefined;

    const sportsById = new Map<
      string,
      {
        id: unknown;
        name: unknown;
        alias: unknown;
        order: unknown;
        gameCount: number;
      }
    >();

    if (sportMap) {
      for (const [sportId, sport] of Object.entries(sportMap)) {
        sportsById.set(sportId, {
          id: sport.id,
          name: sport.name,
          alias: sport.alias,
          order: sport.order,
          gameCount: typeof sport.game === "number" ? sport.game : 0,
        });
      }
    }

    if (regionMap) {
      for (const region of Object.values(regionMap)) {
        const nestedSportMap = region.sport as
          | Record<string, Record<string, unknown>>
          | undefined;
        if (!nestedSportMap) continue;
        for (const [sportId, sport] of Object.entries(nestedSportMap)) {
          const previous = sportsById.get(sportId);
          const gameCount = typeof sport.game === "number" ? sport.game : 0;
          sportsById.set(sportId, {
            id: sport.id,
            name: sport.name,
            alias: sport.alias,
            order: sport.order,
            gameCount: Math.max(previous?.gameCount || 0, gameCount),
          });
        }
      }
    }

    const sports = Array.from(sportsById.values())
      .filter((s) => (s.gameCount as number) > 0)
      .sort((a, b) => (a.order as number) - (b.order as number));

    return NextResponse.json(sports);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
