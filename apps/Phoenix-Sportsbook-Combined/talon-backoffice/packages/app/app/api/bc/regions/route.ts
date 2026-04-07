import { NextRequest, NextResponse } from "next/server";
import { swarmQuery } from "../swarm";

export const dynamic = "force-dynamic";

const SPORT_ALIAS_MAP: Record<string, string> = {
  soccer: "Soccer",
  football: "Soccer",
  basketball: "Basketball",
  tennis: "Tennis",
  baseball: "Baseball",
  hockey: "IceHockey",
  "ice-hockey": "IceHockey",
  "american-football": "AmericanFootball",
  cricket: "Cricket",
  rugby: "RugbyUnion",
  volleyball: "Volleyball",
  mma: "Mma",
  boxing: "Boxing",
};

function normalizeSportAlias(rawAlias: string) {
  return SPORT_ALIAS_MAP[rawAlias.toLowerCase()] || rawAlias;
}

export async function GET(request: NextRequest) {
  const sportAlias = request.nextUrl.searchParams.get("sport");
  if (!sportAlias) {
    return NextResponse.json({ error: "Missing sport param" }, { status: 400 });
  }
  const normalizedSportAlias = normalizeSportAlias(sportAlias);

  try {
    const data = await swarmQuery({
      source: "betting",
      what: {
        region: ["id", "name", "alias", "order"],
        competition: ["id", "name", "order"],
        game: "@count",
      },
      where: {
        sport: { alias: normalizedSportAlias },
        game: { type: { "@in": [0, 2] } },
      },
    });

    const raw = data as Record<string, unknown>;

    // Swarm response nests: region > competition > game (sport is filtered out
    // by the where clause, so the top level is region directly).
    const regionMap = raw.region as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!regionMap) return NextResponse.json([]);

    // Collect all competitions across all regions
    const competitions: Array<{
      id: unknown;
      name: unknown;
      order: unknown;
      gameCount: number;
    }> = [];

    for (const region of Object.values(regionMap)) {
      const compMap = region.competition as
        | Record<string, Record<string, unknown>>
        | undefined;
      if (!compMap) continue;
      for (const comp of Object.values(compMap)) {
        const gameCount =
          typeof comp.game === "number"
            ? comp.game
            : typeof comp.game === "object" && comp.game !== null
            ? Object.keys(comp.game as Record<string, unknown>).length
            : 0;
        competitions.push({
          id: comp.id,
          name: comp.name,
          order: comp.order,
          gameCount,
        });
      }
    }

    const filtered = competitions
      .filter((c) => c.gameCount > 0)
      .sort((a, b) => (a.order as number) - (b.order as number));

    return NextResponse.json(filtered);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
