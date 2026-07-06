import { describe, expect, it } from "vitest";
import {
  normalizeAuditActionForDisplay,
  resolveCategory,
  resolveType,
} from "../components/audit-logs/utils/resolvers";
import { OfficeAuditLogCategory, OfficeAuditLogType } from "../types/logs";

describe("audit log resolver mappings", () => {
  it("keeps enum category/type mappings", () => {
    expect(resolveCategory(OfficeAuditLogCategory.CREATION)).toBe(
      "CELL_TYPE_CREATION",
    );
    expect(resolveType(OfficeAuditLogType.ACCOUNT_CREATION)).toBe(
      "CELL_ACTION_ACCOUNT_CREATION",
    );
  });

  it("maps legacy bet audit actions to prediction-native display keys", () => {
    expect(normalizeAuditActionForDisplay("bet.placed")).toBe(
      "prediction.order.placed",
    );
    expect(resolveCategory(undefined, "bet.placed")).toBe("CELL_TYPE_TRADING");
    expect(resolveType(undefined, "bet.placed")).toBe(
      "CELL_ACTION_PREDICTION_ORDER_PLACED",
    );
    expect(resolveType(undefined, "bet.precheck.failed")).toBe(
      "CELL_ACTION_PREDICTION_ORDER_PRECHECK_FAILED",
    );
  });

  it("maps prediction and provider actions to explicit labels", () => {
    expect(resolveCategory(undefined, "prediction.market.updated")).toBe(
      "CELL_TYPE_TRADING",
    );
    expect(resolveCategory(undefined, "provider.cancel.failed")).toBe(
      "CELL_TYPE_PROVIDER",
    );
    expect(resolveCategory(undefined, "config.updated")).toBe(
      "CELL_TYPE_CONFIGURATION",
    );
    expect(resolveType(undefined, "prediction.order.previewed")).toBe(
      "CELL_ACTION_PREDICTION_ORDER_PREVIEWED",
    );
    expect(resolveType(undefined, "market.updated")).toBe(
      "CELL_ACTION_MARKET_UPDATED",
    );
    expect(resolveType(undefined, "provider.stream.sla.default.updated")).toBe(
      "CELL_ACTION_PROVIDER_ACK_SLA_DEFAULT_UPDATED",
    );
  });
});
