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
  const rawSportAlias = request.nextUrl.searchParams.get("sport");
  const competitionId = request.nextUrl.searchParams.get("competition");
  const sportAlias = rawSportAlias ? normalizeSportAlias(rawSportAlias) : null;

  if (!sportAlias && !competitionId) {
    return NextResponse.json(
      { error: "Missing sport or competition param" },
      { status: 400 },
    );
  }

  try {
    const where: Record<string, unknown> = {
      game: { type: { "@in": [0, 1, 2] } },
    };

    // Sport filter is optional when competition ID is provided
    // (competition IDs are globally unique in Swarm)
    if (sportAlias && !competitionId) {
      where.sport = { alias: sportAlias };
    }

    if (competitionId) {
      where.competition = { id: Number(competitionId) };
    }

    const data = await swarmQuery({
      source: "betting",
      what: {
        sport: ["id", "name", "alias"],
        region: ["id", "name", "alias"],
        game: [
          "id",
          "start_ts",
          "team1_name",
          "team2_name",
          "type",
          "markets_count",
          "info",
        ],
        competition: ["id", "name"],
        market: ["id", "type", "name", "display_key", "main_order", "base"],
        event: ["id", "price", "type", "name", "order", "base"],
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
          // Extract markets for this game
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
                events.sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0));
              }

              markets.push({
                id: marketId,
                type: market.type,
                name: market.name,
                displayKey: market.display_key,
                mainOrder: market.main_order,
                base: market.base,
                selections: events,
              });
            }
            markets.sort((a, b) => ((a.mainOrder as number) || 999) - ((b.mainOrder as number) || 999));
          }

          games.push({
            id: game.id,
            start_ts: game.start_ts,
            team1_name: game.team1_name,
            team2_name: game.team2_name,
            type: game.type,
            markets_count: game.markets_count,
            info: game.info,
            competitionId: compId,
            competitionName: comp.name,
            markets,
          });
        }
      }
    }

    function extractFromRegionMap(
      regionMap: Record<string, Record<string, unknown>> | undefined,
    ) {
      if (!regionMap) return;
      for (const region of Object.values(regionMap)) {
        const compMap = region.competition as
          | Record<string, Record<string, unknown>>
          | undefined;
        if (compMap) extractFromCompMap(compMap);
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

    extractFromRegionMap(
      raw.region as Record<string, Record<string, unknown>> | undefined,
    );

    const sportMap = raw.sport as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (sportMap) {
      for (const sport of Object.values(sportMap)) {
        const nestedCompMap = sport.competition as
          | Record<string, Record<string, unknown>>
          | undefined;
        if (nestedCompMap) extractFromCompMap(nestedCompMap);
        extractFromRegionMap(
          sport.region as Record<string, Record<string, unknown>> | undefined,
        );
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
