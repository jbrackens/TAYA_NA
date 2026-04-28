import { resolveCategory, resolveType } from "../resolvers";
import {
  TalonAuditLogCategory,
  TalonAuditLogType,
} from "../../../../types/logs";

describe("audit log resolver mappings", () => {
  test("keeps legacy category/type mappings", () => {
    expect(resolveCategory(TalonAuditLogCategory.CREATION)).toBe(
      "CELL_TYPE_CREATION",
    );
    expect(resolveType(TalonAuditLogType.ACCOUNT_CREATION)).toBe(
      "CELL_ACTION_ACCOUNT_CREATION",
    );
  });

  test("maps newer action families to category keys", () => {
    expect(resolveCategory(undefined, "bet.placed")).toBe("CELL_TYPE_TRADING");
    expect(resolveCategory(undefined, "provider.cancel.failed")).toBe(
      "CELL_TYPE_PROVIDER",
    );
    expect(resolveCategory(undefined, "config.updated")).toBe(
      "CELL_TYPE_CONFIGURATION",
    );
  });

  test("maps newer actions to explicit action keys", () => {
    expect(resolveType(undefined, "fixed_exotic.quote.expired")).toBe(
      "CELL_ACTION_FIXED_EXOTIC_EXPIRED",
    );
    expect(resolveType(undefined, "market.updated")).toBe(
      "CELL_ACTION_MARKET_UPDATED",
    );
    expect(resolveType(undefined, "provider.cancel.succeeded")).toBe(
      "CELL_ACTION_PROVIDER_CANCEL_SUCCEEDED",
    );
    expect(resolveType(undefined, "provider.stream.acknowledged")).toBe(
      "CELL_ACTION_PROVIDER_ACKNOWLEDGED",
    );
    expect(resolveType(undefined, "provider.stream.reassigned")).toBe(
      "CELL_ACTION_PROVIDER_REASSIGNED",
    );
    expect(resolveType(undefined, "provider.stream.resolved")).toBe(
      "CELL_ACTION_PROVIDER_RESOLVED",
    );
    expect(resolveType(undefined, "provider.stream.reopened")).toBe(
      "CELL_ACTION_PROVIDER_REOPENED",
    );
    expect(resolveType(undefined, "provider.stream.sla.default.updated")).toBe(
      "CELL_ACTION_PROVIDER_ACK_SLA_DEFAULT_UPDATED",
    );
    expect(resolveType(undefined, "provider.stream.sla.adapter.updated")).toBe(
      "CELL_ACTION_PROVIDER_ACK_SLA_ADAPTER_UPDATED",
    );
  });
});
