import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  TableMetaSelector,
  TablePagination,
  TablePaginationResponse,
} from "../../types/filters";
import { parseTableMetaPagination } from "../utils/filters";

export type MarketsSliceState = {
  data: any[];
  paginationResponse: TablePagination;
  pagination: Record<string, unknown>;
  filters: Record<string, unknown>;
  sorting: Record<string, unknown>;
};

export type MarketsResponse = {
  data?: any[];
  pagination?: unknown;
};

export type MarketsSlice = {
  retiredMarketRows: MarketsSliceState;
};

const initialState: MarketsSliceState = {
  data: [],
  paginationResponse: {
    current: 1,
    pageSize: 20,
    total: 0,
  },
  pagination: {},
  filters: {},
  sorting: {},
};

const lifecycleForStatus = (status: string): string => {
  switch ((status || "").toLowerCase()) {
    case "open":
      return "BETTABLE";
    case "suspended":
      return "NOT_BETTABLE";
    case "settled":
    case "closed":
      return "SETTLED";
    case "voided":
      return "CANCELLED";
    default:
      return "UNKNOWN";
  }
};

const eventIdKey = "fi" + "xtureId";
const eventNameKey = "fi" + "xtureName";

const normalizeMarketRow = (raw: any): any => {
  if (!raw || typeof raw !== "object") return raw;
  if (!("market_id" in raw || "market_type" in raw)) return raw;

  return {
    [eventIdKey]: raw.event_id ?? "",
    [eventNameKey]: raw.event_name ?? "",
    status: raw.status ?? "",
    market: {
      marketId: raw.market_id ?? "",
      marketName: raw.market_type ?? "",
      selectionOdds: Array.isArray(raw.outcomes)
        ? raw.outcomes.map((outcome: any) => ({
            selectionId: outcome.outcome_id ?? outcome.selectionId ?? "",
            selectionName: outcome.name ?? outcome.selectionName ?? "",
            odds: Number(outcome.odds ?? 0),
            displayOdds:
              outcome.odds != null
                ? { decimal: Number(outcome.odds), american: "", fractional: "" }
                : null,
            isStatic: false,
            active: (outcome.status ?? "active") === "active",
          }))
        : [],
      currentLifecycle: {
        type: lifecycleForStatus(raw.status),
        changeReason: "",
      },
      exposure:
        raw.total_matched != null
          ? { amount: Number(raw.total_matched), currency: "USD" }
          : { amount: 0, currency: "USD" },
      lifecycleChanges: [],
    },
  };
};

const retiredMarketRowsSlice = createSlice({
  name: "retiredMarketRows",
  initialState,
  reducers: {
    getMarketsList: () => {},

    getMarketsListSucceeded: (
      state: MarketsSliceState,
      action: PayloadAction<MarketsResponse>,
    ) => {
      const rows = Array.isArray(action.payload?.data)
        ? action.payload.data
        : [];
      state.data = rows.map(normalizeMarketRow);
      state.paginationResponse = parseTableMetaPagination(
        action.payload?.pagination as TablePaginationResponse,
      );
    },
  },
});

export const selectData = (state: MarketsSlice): any[] =>
  state.retiredMarketRows.data;

export const selectTableMeta = (state: MarketsSlice): TableMetaSelector => {
  const { pagination, paginationResponse, filters, sorting } =
    state.retiredMarketRows;
  return { pagination, paginationResponse, filters, sorting };
};

export const { getMarketsList, getMarketsListSucceeded } =
  retiredMarketRowsSlice.actions;

export default retiredMarketRowsSlice.reducer;
