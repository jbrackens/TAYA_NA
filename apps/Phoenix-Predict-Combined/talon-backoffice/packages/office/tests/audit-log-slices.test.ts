import { describe, expect, it } from "vitest";
import logsReducer, { getListSucceeded } from "../lib/slices/logsSlice";
import usersDetailsReducer, {
  getUserAuditLogsSucceeded,
} from "../lib/slices/usersDetailsSlice";
import {
  normalizeAuditActionForDisplay,
  resolveProductLabel,
  resolveType,
} from "../components/audit-logs/utils/resolvers";

describe("audit log slice normalization", () => {
  it("keeps legacy audit table payloads readable with prediction-native display mapping", () => {
    const state = logsReducer(
      undefined,
      getListSucceeded({
        data: [
          {
            id: "al:1",
            action: "bet.placed",
            occurredAt: "2026-03-05T10:00:00Z",
          },
        ],
        currentPage: 2,
        itemsPerPage: 50,
        totalCount: 120,
      } as any),
    );

    expect(state.data).toHaveLength(1);
    expect(state.data[0].action).toBe("bet.placed");
    expect(normalizeAuditActionForDisplay(state.data[0].action)).toBe(
      "prediction.order.placed",
    );
    expect(resolveType(undefined, state.data[0].action)).toBe(
      "CELL_ACTION_PREDICTION_ORDER_PLACED",
    );
    expect(state.paginationResponse).toEqual({
      current: 2,
      pageSize: 50,
      total: 120,
    });
  });

  it("accepts gateway items plus pagination payloads", () => {
    const state = logsReducer(
      undefined,
      getListSucceeded({
        data: [] as any,
        items: [
          {
            id: "al:2",
            action: "config.updated",
            occurredAt: "2026-03-05T12:00:00Z",
          },
        ],
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

describe("usersDetailsSlice per-user audit normalization", () => {
  it("normalizes Go snake_case audit rows while keeping legacy actions display-safe", () => {
    const state = usersDetailsReducer(
      undefined,
      getUserAuditLogsSucceeded({
        data: [
          {
            id: "al:1",
            action: "bet.placed",
            actor_id: "usr_42",
            entity_type: "PREDICTION_ORDER",
            entity_id: "prediction_order_99",
            old_value: { status: "OPEN" },
            new_value: { status: "SETTLED" },
            created_at: "2026-03-05T10:00:00Z",
            ip_address: "192.168.1.1",
            product: "prediction",
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
    expect(row.category).toBe("PREDICTION_ORDER");
    expect(row.type).toBe("PREDICTION_ORDER");
    expect(row.targetId).toBe("prediction_order_99");
    expect(row.dataBefore).toEqual({ status: "OPEN" });
    expect(row.dataAfter).toEqual({ status: "SETTLED" });
    expect(row.createdAt).toBe("2026-03-05T10:00:00Z");
    expect(normalizeAuditActionForDisplay(row.action)).toBe(
      "prediction.order.placed",
    );
    expect(resolveProductLabel(row.product, row.action)).toBe(
      "CELL_PRODUCT_PREDICTION",
    );
    expect(state.auditLogs.paginationResponse).toEqual({
      current: 1,
      pageSize: 20,
      total: 1,
    });
  });

  it("accepts Go items plus pagination shape", () => {
    const state = usersDetailsReducer(
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

  it("preserves legacy camelCase rows without double-mapping", () => {
    const state = usersDetailsReducer(
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
