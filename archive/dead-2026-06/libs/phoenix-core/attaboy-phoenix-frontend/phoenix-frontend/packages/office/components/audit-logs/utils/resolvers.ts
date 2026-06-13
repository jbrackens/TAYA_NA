import { enumToObject } from "../../../lib/utils/enums";
import { buildTableFilterOptions } from "../../../lib/utils/filters";
import {
  TalonAuditLogCategory,
  TalonAuditLogType,
} from "../../../types/logs.d";

export const resolveCategory = (type: TalonAuditLogCategory) => {
  switch (type) {
    case TalonAuditLogCategory.CREATION:
      return "CELL_TYPE_CREATION";
    case TalonAuditLogCategory.ADJUSTMENT:
      return "CELL_TYPE_ADJUSTMENT";
    default:
      return "CELL_TYPE_UNKNOWN";
  }
};

export const resolveType = (type: TalonAuditLogType) => {
  switch (type) {
    case TalonAuditLogType.ACCOUNT_CREATION:
      return "CELL_ACTION_ACCOUNT_CREATION";
    case TalonAuditLogType.ACCOUNT_CLOSURE:
      return "CELL_ACTION_ACCOUNT_CLOSURE";
    default:
      return "CELL_ACTION_UNKNOWN";
  }
};

export const composeOptions = (t: any, prefix?: string) =>
  buildTableFilterOptions(enumToObject(TalonAuditLogCategory), t, prefix);
