import {
  BetResult,
  BetResultEnum,
  BetStatus,
  BetStatusEnum,
  BetType,
  BetTypeEnum,
} from "@phoenix-ui/utils";
import { enumToObject } from "../../../lib/utils/enums";
import { buildTableFilterOptions } from "../../../lib/utils/filters";

export const resolveResult = (status: BetResult) => {
  // let color = "gray";
  // let tKey = "CELL_RESULT_UNKNOWN";
  let color = "";
  let tKey = "";
  switch (status) {
    case BetResultEnum.WON:
      color = "green";
      tKey = "CELL_RESULT_WON";
      break;
    case BetResultEnum.LOST:
      color = "red";
      tKey = "CELL_RESULT_LOST";
      break;
    case BetResultEnum.CANCELLED:
      color = "red";
      tKey = "CELL_RESULT_CANCELLED";
      break;
    case BetResultEnum.CASHED_OUT:
      color = "geekblue";
      tKey = "CELL_RESULT_CASHED_OUT";
      break;
  }
  return { color, tKey };
};

export const resolveStatus = (status: BetStatus) => {
  // let color = "gray";
  // let tKey = "CELL_STATUS_UNKNOWN";
  let color = "";
  let tKey = "";
  switch (status) {
    case BetStatusEnum.SETTLED:
      color = "green";
      tKey = "CELL_STATUS_SETTLED";
      break;
    case BetStatusEnum.RESETTLED:
      color = "green";
      tKey = "CELL_STATUS_RESETTLED";
      break;
    case BetStatusEnum.CANCELLED:
      color = "red";
      tKey = "CELL_STATUS_CANCELLED";
      break;
    case BetStatusEnum.OPEN:
      color = "geekblue";
      tKey = "CELL_STATUS_OPEN";
      break;
    case BetStatusEnum.VOIDED:
      color = "gray";
      tKey = "CELL_STATUS_VOIDED";
    case BetStatusEnum.PUSHED:
      color = "gray";
      tKey = "CELL_STATUS_PUSHED";
      break;
  }
  return { color, tKey };
};

export const composeResultOptions = (t: any, prefix?: string) =>
  buildTableFilterOptions(enumToObject(BetResultEnum), t, prefix);

export const resolveType = (status: BetType) => {
  switch (status) {
    case BetTypeEnum.SINGLE:
      return "CELL_TYPE_SINGLE";
    case BetTypeEnum.MULTI:
      return "CELL_TYPE_MULTI";
      break;
  }
  return "CELL_TYPE_UNKNOWN";
};

export const composeTypeOptions = (t: any, prefix?: string) =>
  buildTableFilterOptions(enumToObject(BetTypeEnum), t, prefix);
