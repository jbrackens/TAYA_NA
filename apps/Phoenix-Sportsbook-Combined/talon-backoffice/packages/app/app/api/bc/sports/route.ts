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

    const sportMap = (data as Record<string, unknown>).sport as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!sportMap) {
      return NextResponse.json([]);
    }

    const sports = Object.values(sportMap)
      .map((s) => ({
        id: s.id,
        name: s.name,
        alias: s.alias,
        order: s.order,
        gameCount: s.game || 0,
      }))
      .filter((s) => (s.gameCount as number) > 0)
      .sort((a, b) => (a.order as number) - (b.order as number));

    return NextResponse.json(sports);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
