import { enumToObject } from "../../../lib/utils/enums";
import { buildTableFilterOptions } from "../../../lib/utils/filters";
import { TalonAuditLogCategory, TalonAuditLogType } from "../../../types/logs";

const resolveActionCategory = (action: string): string => {
  const normalizedAction = normalizeAuditActionForDisplay(action);
  if (normalizedAction.startsWith("prediction.")) {
    return "CELL_TYPE_TRADING";
  }
  if (normalizedAction.startsWith("provider.")) {
    return "CELL_TYPE_PROVIDER";
  }
  if (normalizedAction.startsWith("punter.")) {
    return "CELL_TYPE_ACCOUNT";
  }
  if (normalizedAction.startsWith("market.")) {
    return "CELL_TYPE_OPERATIONS";
  }
  if (normalizedAction.startsWith("config.")) {
    return "CELL_TYPE_CONFIGURATION";
  }
  return "CELL_TYPE_UNKNOWN";
};

export const normalizeAuditActionForDisplay = (action?: string): string => {
  const normalized = `${action || ""}`.trim().toLowerCase();
  switch (normalized) {
    case "bet.placed":
      return "prediction.order.placed";
    case "bet.precheck.failed":
    case "bet.precheck_failed":
      return "prediction.order.precheck_failed";
    default:
      return normalized;
  }
};

export const resolveCategory = (
  type?: TalonAuditLogCategory | string,
  action?: string,
) => {
  switch (`${type || ""}`) {
    case TalonAuditLogCategory.CREATION:
      return "CELL_TYPE_CREATION";
    case TalonAuditLogCategory.ADJUSTMENT:
      return "CELL_TYPE_ADJUSTMENT";
    default:
      return resolveActionCategory(`${action || ""}`.toLowerCase());
  }
};

const actionTypeMap: Record<string, string> = {
  "market.updated": "CELL_ACTION_MARKET_UPDATED",
  "config.updated": "CELL_ACTION_CONFIG_UPDATED",
  "punter.suspended": "CELL_ACTION_PUNTER_SUSPENDED",
  "provider.cancel.failed": "CELL_ACTION_PROVIDER_CANCEL_FAILED",
  "provider.cancel.succeeded": "CELL_ACTION_PROVIDER_CANCEL_SUCCEEDED",
  "provider.stream.acknowledged": "CELL_ACTION_PROVIDER_ACKNOWLEDGED",
  "provider.stream.reassigned": "CELL_ACTION_PROVIDER_REASSIGNED",
  "provider.stream.resolved": "CELL_ACTION_PROVIDER_RESOLVED",
  "provider.stream.reopened": "CELL_ACTION_PROVIDER_REOPENED",
  "provider.stream.sla.default.updated":
    "CELL_ACTION_PROVIDER_ACK_SLA_DEFAULT_UPDATED",
  "provider.stream.sla.adapter.updated":
    "CELL_ACTION_PROVIDER_ACK_SLA_ADAPTER_UPDATED",
  "prediction.market.created": "CELL_ACTION_PREDICTION_MARKET_CREATED",
  "prediction.market.updated": "CELL_ACTION_PREDICTION_MARKET_UPDATED",
  "prediction.market.suspended": "CELL_ACTION_PREDICTION_MARKET_SUSPENDED",
  "prediction.market.reopened": "CELL_ACTION_PREDICTION_MARKET_REOPENED",
  "prediction.market.cancelled": "CELL_ACTION_PREDICTION_MARKET_CANCELLED",
  "prediction.market.resolved": "CELL_ACTION_PREDICTION_MARKET_RESOLVED",
  "prediction.market.resettled": "CELL_ACTION_PREDICTION_MARKET_RESETTLED",
  "prediction.order.placed": "CELL_ACTION_PREDICTION_ORDER_PLACED",
  "prediction.order.precheck_failed":
    "CELL_ACTION_PREDICTION_ORDER_PRECHECK_FAILED",
  "prediction.order.previewed": "CELL_ACTION_PREDICTION_ORDER_PREVIEWED",
};

export const resolveProductLabel = (
  product?: string,
  action?: string,
): string => {
  const normalizedProduct = `${product || ""}`.trim().toLowerCase();
  if (normalizedProduct === "prediction") {
    return "CELL_PRODUCT_PREDICTION";
  }
  if (`${action || ""}`.trim().toLowerCase().startsWith("prediction.")) {
    return "CELL_PRODUCT_PREDICTION";
  }
  return "CELL_RESULT_UNKNOWN";
};

export const resolveType = (
  type?: TalonAuditLogType | string,
  action?: string,
) => {
  switch (`${type || ""}`) {
    case TalonAuditLogType.ACCOUNT_CREATION:
      return "CELL_ACTION_ACCOUNT_CREATION";
    case TalonAuditLogType.ACCOUNT_CLOSURE:
      return "CELL_ACTION_ACCOUNT_CLOSURE";
    default:
      return (
        actionTypeMap[normalizeAuditActionForDisplay(action)] ||
        "CELL_ACTION_UNKNOWN"
      );
  }
};

export const composeOptions = (t: any, prefix?: string) =>
  buildTableFilterOptions(enumToObject(TalonAuditLogCategory), t, prefix);
