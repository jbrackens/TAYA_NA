import { enumToObject } from "../../../../lib/utils/enums";
import {
  WalletHistoryStatus,
  WalletHistoryStatusEnum,
  WalletActionType,
  WalletActionTypeEnum,
  WalletProduct,
  WalletProductEnum,
} from "@taptrade-ui/utils";
import { buildTableFilterOptions } from "../../../../lib/utils/filters";

export const resolveStatus = (status: WalletHistoryStatus) => {
  let color = "gray";
  let tKey = "STATUS_UNKNOWN";
  switch (status) {
    case WalletHistoryStatusEnum.COMPLETED:
      color = "green";
      tKey = "CELL_STATUS_COMPLETED";
      break;
    case WalletHistoryStatusEnum.PENDING:
      color = "yellow";
      tKey = "CELL_STATUS_PENDING";
      break;
    case WalletHistoryStatusEnum.CANCELLED:
      color = "red";
      tKey = "CELL_STATUS_CANCELLED";
      break;
  }
  return { color, tKey };
};

export const composeOptions = (t: any, prefix?: string) =>
  buildTableFilterOptions(enumToObject(WalletActionTypeEnum), t, prefix);

export const composeProductOptions = (t: any, prefix?: string) =>
  buildTableFilterOptions(enumToObject(WalletProductEnum), t, prefix);

export const resolveType = (type: WalletActionType) => {
  switch (type) {
    case WalletActionTypeEnum.BET_PLACEMENT:
      return "CELL_TYPE_ORDER_PLACEMENT";
    case WalletActionTypeEnum.BET_SETTLEMENT:
      return "CELL_TYPE_ORDER_SETTLEMENT";
    case WalletActionTypeEnum.DEPOSIT:
      return "CELL_TYPE_POINTS_ADDED";
    case WalletActionTypeEnum.WITHDRAWAL:
      return "CELL_TYPE_POINTS_USED";
    case WalletActionTypeEnum.ADJUSTMENT_DEPOSIT:
      return "CELL_TYPE_ADJUSTMENT_ADD";
    case WalletActionTypeEnum.ADJUSTMENT_WITHDRAWAL:
      return "CELL_TYPE_ADJUSTMENT_USE";
    default:
      return "CELL_TYPE_UNKNOWN";
  }
};

export const resolveProduct = (product: WalletProduct) => {
  switch (product) {
    case WalletProductEnum.SPORTSBOOK:
      return "CELL_PRODUCT_SPORTSBOOK";
    case WalletProductEnum.PREDICTION:
      return "CELL_PRODUCT_PREDICTION";
    default:
      return "CELL_PRODUCT_UNKNOWN";
  }
};
