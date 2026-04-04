import reducer, {
  getUserAuditLogsSucceeded,
} from "../usersDetailsSlice";

describe("usersDetailsSlice per-user audit normalization", () => {
  test("normalizes Go snake_case audit rows to camelCase", () => {
    const state = reducer(
      undefined,
      getUserAuditLogsSucceeded({
        data: [
          {
            id: "al:1",
            action: "bet.placed",
            actor_id: "usr_42",
            entity_type: "BET",
            entity_id: "bet_99",
            old_value: { status: "OPEN" },
            new_value: { status: "SETTLED" },
            created_at: "2026-03-05T10:00:00Z",
            ip_address: "192.168.1.1",
            product: "SPORTSBOOK",
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
        },
      } as any),
    );

    expect(state.auditLogs.data).toHaveLength(1);
    const row = state.auditLogs.data[0];
    expect(row.actorId).toBe("usr_42");
    expect(row.category).toBe("BET");
    expect(row.type).toBe("BET");
    expect(row.targetId).toBe("bet_99");
    expect(row.dataBefore).toEqual({ status: "OPEN" });
    expect(row.dataAfter).toEqual({ status: "SETTLED" });
    expect(row.createdAt).toBe("2026-03-05T10:00:00Z");
    expect(state.auditLogs.paginationResponse).toEqual({
      current: 1,
      pageSize: 20,
      total: 1,
    });
  });

  test("accepts Go items + pagination shape", () => {
    const state = reducer(
      undefined,
      getUserAuditLogsSucceeded({
        data: [] as any,
        items: [
          {
            id: "al:2",
            action: "config.updated",
            created_at: "2026-03-06T12:00:00Z",
          },
        ],
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
        },
      } as any),
    );

    expect(state.auditLogs.data).toHaveLength(1);
    expect(state.auditLogs.data[0].createdAt).toBe("2026-03-06T12:00:00Z");
    expect(state.auditLogs.paginationResponse).toEqual({
      current: 2,
      pageSize: 10,
      total: 25,
    });
  });

  test("preserves legacy camelCase rows without double-mapping", () => {
    const state = reducer(
      undefined,
      getUserAuditLogsSucceeded({
        data: [
          {
            id: "al:3",
            action: "user.login",
            actorId: "usr_1",
            category: "AUTH",
            type: "AUTH",
            createdAt: "2026-03-07T08:00:00Z",
          },
        ],
        currentPage: 1,
        itemsPerPage: 20,
        totalCount: 1,
      } as any),
    );

    expect(state.auditLogs.data).toHaveLength(1);
    const row = state.auditLogs.data[0];
    expect(row.actorId).toBe("usr_1");
    expect(row.category).toBe("AUTH");
    expect(row.createdAt).toBe("2026-03-07T08:00:00Z");
  });
});
