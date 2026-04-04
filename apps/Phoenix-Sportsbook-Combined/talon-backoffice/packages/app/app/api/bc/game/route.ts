import { NextRequest, NextResponse } from "next/server";
import { swarmQuery } from "../swarm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gameId = request.nextUrl.searchParams.get("id");
  if (!gameId) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }

  try {
    const data = await swarmQuery({
      source: "betting",
      what: {
        sport: ["name", "alias"],
        competition: ["name"],
        region: ["name"],
        game: [
          [
            "id",
            "start_ts",
            "team1_name",
            "team2_name",
            "type",
            "markets_count",
            "info",
            "stats",
          ],
        ],
        market: [
          "type",
          "name",
          "display_key",
          "base",
          "col_count",
          "express_id",
          "main_order",
        ],
        event: ["id", "price", "type", "name", "order", "base"],
      },
      where: {
        game: { id: Number(gameId) },
      },
    });

    // Flatten the nested structure to find the game
    const sportMap = (data as Record<string, unknown>).sport as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!sportMap) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    for (const sport of Object.values(sportMap)) {
      const regionMap = sport.region as
        | Record<string, Record<string, unknown>>
        | undefined;
      if (!regionMap) continue;

      for (const region of Object.values(regionMap)) {
        const compMap = region.competition as
          | Record<string, Record<string, unknown>>
          | undefined;
        if (!compMap) continue;

        for (const comp of Object.values(compMap)) {
          const gameMap = comp.game as
            | Record<string, Record<string, unknown>>
            | undefined;
          if (!gameMap) continue;

          for (const game of Object.values(gameMap)) {
            // Found the game — flatten markets
            const markets: Record<string, unknown>[] = [];
            const marketMap = game.market as
              | Record<string, Record<string, unknown>>
              | undefined;

            if (marketMap) {
              for (const [marketId, market] of Object.entries(marketMap)) {
                const events: Record<string, unknown>[] = [];
                const eventMap = market.event as
                  | Record<string, Record<string, unknown>>
                  | undefined;

                if (eventMap) {
                  for (const [eventId, evt] of Object.entries(eventMap)) {
                    events.push({ id: eventId, ...evt });
                  }
                  events.sort(
                    (a, b) =>
                      ((a.order as number) || 0) - ((b.order as number) || 0),
                  );
                }

                markets.push({
                  id: marketId,
                  type: market.type,
                  name: market.name,
                  displayKey: market.display_key,
                  base: market.base,
                  colCount: market.col_count,
                  expressId: market.express_id,
                  mainOrder: market.main_order,
                  selections: events,
                });
              }
              markets.sort(
                (a, b) =>
                  ((a.mainOrder as number) || 999) -
                  ((b.mainOrder as number) || 999),
              );
            }

            return NextResponse.json({
              id: game.id,
              startTs: game.start_ts,
              team1: game.team1_name,
              team2: game.team2_name,
              type: game.type,
              marketsCount: game.markets_count,
              info: game.info,
              stats: game.stats,
              sportName: sport.name,
              sportAlias: sport.alias,
              regionName: region.name,
              competitionName: comp.name,
              markets,
            });
          }
        }
      }
    }

    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
