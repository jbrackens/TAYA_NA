import {
  transformGoEvent,
  transformGoEventsResponse,
  transformGoSports,
} from "../events-transforms";

describe("go events transforms", () => {
  test("maps current phoenix list-events payload shape", () => {
    const response = {
      data: [
        {
          event_id: "evt-1",
          name: "Alex Hunter vs Rico Stone",
          sport: "mma",
          league: "UFC",
          home_team: "Alex Hunter",
          away_team: "Rico Stone",
          scheduled_start: "2026-04-01T18:00:00Z",
          status: "scheduled",
          created_at: "2026-03-17T21:28:41.727206Z",
          updated_at: "2026-03-17T21:28:41.727206Z",
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 3,
      },
    };

    const transformed = transformGoEventsResponse(response);

    expect(transformed.currentPage).toBe(1);
    expect(transformed.itemsPerPage).toBe(20);
    expect(transformed.totalCount).toBe(3);
    expect(transformed.data[0].fixtureId).toBe("evt-1");
    expect(transformed.data[0].startTime).toBe("2026-04-01T18:00:00Z");
    expect(transformed.data[0].status).toBe("PRE_GAME");
  });

  test("maps scheduled_start and score fields from current event payload", () => {
    const transformed = transformGoEvent({
      event_id: "evt-2",
      sport: "soccer",
      league: "Premier League",
      home_team: "Manchester United",
      away_team: "Liverpool",
      scheduled_start: "2026-04-02T19:00:00Z",
      status: "live",
      live_score: {
        home_score: 2,
        away_score: 1,
        last_update: "2026-04-02T19:45:00Z",
      },
      created_at: "2026-03-17T21:28:41.727206Z",
      updated_at: "2026-03-17T21:28:41.727206Z",
    } as any) as any;

    expect(transformed.startTime).toBe("2026-04-02T19:00:00Z");
    expect(transformed.score.home).toBe(2);
    expect(transformed.score.away).toBe(1);
    expect(transformed.status).toBe("IN_PLAY");
  });

  test("handles sports without leagues arrays", () => {
    const transformed = transformGoSports([
      {
        id: "soccer",
        name: "Soccer",
      },
    ] as any);

    expect(transformed).toHaveLength(1);
    expect(transformed[0].abbreviation).toBe("soccer");
    expect(transformed[0].tournaments).toEqual([]);
  });
});
