import fixturesReducer, { getFixturesListSucceeded } from "../fixturesSlice";
import marketsReducer, { getMarketsListSucceeded } from "../marketsSlice";
import marketsDetailsReducer, {
  getMarketsDetailsSucceeded,
} from "../marketsDetailsSlice";

describe("trading slice normalization", () => {
  test("normalizes Go fixture statuses into Talon fixture enums", () => {
    const state = fixturesReducer(
      undefined,
      getFixturesListSucceeded({
        data: [
          {
            event_id: "evt_1",
            name: "Fixture One",
            sport: "soccer",
            status: "scheduled",
            scheduled_start: "2026-03-17T12:00:00Z",
          },
          {
            event_id: "evt_2",
            name: "Fixture Two",
            sport: "soccer",
            status: "live",
            scheduled_start: "2026-03-17T13:00:00Z",
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
        },
      } as any),
    );

    expect(state.data).toHaveLength(2);
    expect(state.data[0].status).toBe("PRE_GAME");
    expect(state.data[1].status).toBe("IN_PLAY");
    expect(state.paginationResponse).toEqual({
      current: 1,
      pageSize: 20,
      total: 2,
    });
  });

  test("normalizes settled Go market list rows into Talon lifecycle state", () => {
    const state = marketsReducer(
      undefined,
      getMarketsListSucceeded({
        data: [
          {
            market_id: "mrk_1",
            event_id: "evt_1",
            event_name: "Fixture One",
            market_type: "moneyline",
            status: "settled",
            total_matched: 1250,
            outcomes: [],
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
        },
      } as any),
    );

    expect(state.data).toHaveLength(1);
    expect(state.data[0].market.currentLifecycle.type).toBe("SETTLED");
  });

  test("normalizes settled Go market detail rows into Talon lifecycle state", () => {
    const state = marketsDetailsReducer(
      undefined,
      getMarketsDetailsSucceeded({
        market_id: "mrk_1",
        event_id: "evt_1",
        event_name: "Fixture One",
        market_type: "moneyline",
        status: "settled",
        total_matched: 1250,
        outcomes: [],
      } as any),
    );

    expect(state.basic.market.currentLifecycle.type).toBe("SETTLED");
  });
});
