import reducer, { getListSucceeded } from "../logsSlice";

describe("logsSlice response normalization", () => {
  test("accepts legacy data table payload", () => {
    const state = reducer(
      undefined,
      getListSucceeded({
        data: [{ id: "al:1", action: "bet.placed", occurredAt: "2026-03-05T10:00:00Z" }],
        currentPage: 2,
        itemsPerPage: 50,
        totalCount: 120,
      } as any),
    );

    expect(state.data).toHaveLength(1);
    expect(state.paginationResponse).toEqual({
      current: 2,
      pageSize: 50,
      total: 120,
    });
  });

  test("accepts gateway items + pagination payload", () => {
    const state = reducer(
      undefined,
      getListSucceeded({
        data: [] as any,
        items: [{ id: "al:2", action: "config.updated", occurredAt: "2026-03-05T12:00:00Z" }],
        pagination: {
          currentPage: 1,
          itemsPerPage: 20,
          totalCount: 1,
        },
      } as any),
    );

    expect(state.data).toHaveLength(1);
    expect(state.paginationResponse).toEqual({
      current: 1,
      pageSize: 20,
      total: 1,
    });
  });
});
