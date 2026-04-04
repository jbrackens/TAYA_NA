import { NextRequest, NextResponse } from "next/server";
import { swarmQuery } from "../swarm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sportAlias = request.nextUrl.searchParams.get("sport");
  if (!sportAlias) {
    return NextResponse.json({ error: "Missing sport param" }, { status: 400 });
  }

  try {
    const data = await swarmQuery({
      source: "betting",
      what: {
        region: ["id", "name", "alias", "order"],
        competition: ["id", "name", "order"],
        game: "@count",
      },
      where: {
        sport: { alias: sportAlias },
        game: { type: { "@in": [0, 2] } },
      },
    });

    const raw = data as Record<string, unknown>;

    // Return competitions (more useful than regions for league display)
    const compMap = raw.competition as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (compMap) {
      const competitions = Object.values(compMap)
        .map((c) => ({
          id: c.id,
          name: c.name,
          order: c.order,
          gameCount: c.game || 0,
        }))
        .filter((c) => (c.gameCount as number) > 0)
        .sort((a, b) => (a.order as number) - (b.order as number));

      return NextResponse.json(competitions);
    }

    // Fall back to regions
    const regionMap = raw.region as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!regionMap) return NextResponse.json([]);

    const regions = Object.values(regionMap)
      .map((r) => ({
        id: r.id,
        name: r.name,
        alias: r.alias,
        order: r.order,
        gameCount: r.game || 0,
      }))
      .filter((r) => (r.gameCount as number) > 0)
      .sort((a, b) => (a.order as number) - (b.order as number));

    return NextResponse.json(regions);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
