import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TalonSingleMarketFixture } from "../../types/market";
import { parseTableMetaPagination } from "../utils/filters";
import {
  TablePaginationResponse,
  TableMeta,
  TableMetaSelector,
  TablePagination,
} from "../../types/filters";

export type MarketsSliceState = {
  data: TalonSingleMarketFixture[];
  paginationResponse: TablePagination | {};
} & TableMeta;

export type MarketsResponse = {
  data: TalonSingleMarketFixture[];
} & TablePaginationResponse;

export type MarketsSlice = {
  markets: MarketsSliceState;
};

const initialState: MarketsSliceState = {
  data: [],
  pagination: {},
  paginationResponse: {},
  filters: {},
  sorting: {},
};

// Map Go market status to Talon MarketLifecycleType
const mapGoStatusToLifecycle = (status: string): string => {
  switch ((status || "").toLowerCase()) {
    case "open":
      return "BETTABLE";
    case "suspended":
      return "NOT_BETTABLE";
    case "settled":
      return "SETTLED";
    case "closed":
      return "SETTLED";
    case "voided":
      return "CANCELLED";
    default:
      return "UNKNOWN";
  }
};

// Normalize Go snake_case market to Talon TalonSingleMarketFixture
const normalizeGoMarket = (raw: any): TalonSingleMarketFixture => {
  if (!raw || typeof raw !== "object") return raw;
  const isGoFormat =
    "market_id" in raw || "event_id" in raw || "market_type" in raw;
  if (!isGoFormat) return raw as TalonSingleMarketFixture;

  const outcomes = Array.isArray(raw.outcomes) ? raw.outcomes : [];
  const selectionOdds = outcomes.map((o: any) => ({
    selectionId: o.outcome_id ?? o.selectionId ?? "",
    selectionName: o.name ?? o.selectionName ?? "",
    odds: Number(o.odds ?? 0),
    displayOdds: o.odds
      ? { decimal: Number(o.odds), american: "", fractional: "" }
      : null,
    isStatic: false,
    active: (o.status ?? "active") === "active",
  }));

  return {
    fixtureId: raw.event_id ?? "",
    fixtureName: raw.event_name ?? "",
    sport: {
      id: raw.sport ?? "",
      name: raw.sport ?? "",
      abbreviation: raw.sport ?? "",
    },
    status: raw.status ?? "",
    startTime: raw.scheduled_start ?? "",
    isLive: false,
    competitors: [],
    score: { home: 0, away: 0 },
    scoreHistory: [],
    market: {
      marketId: raw.market_id ?? "",
      marketName: raw.market_type ?? "",
      selectionOdds,
      currentLifecycle: {
        type: mapGoStatusToLifecycle(raw.status),
        changeReason: "",
      },
      exposure:
        raw.total_matched != null
          ? { amount: Number(raw.total_matched), currency: "USD" }
          : { amount: 0, currency: "USD" },
      lifecycleChanges: [],
    },
  } as any;
};

// Normalize Go pagination {page, limit, total} to Talon {currentPage, itemsPerPage, totalCount}
const normalizeGoMarketsPagination = (payload: any): any => {
  if (payload?.pagination && typeof payload.pagination === "object") {
    const p = payload.pagination;
    return {
      currentPage: p.currentPage ?? p.page ?? 1,
      itemsPerPage: p.itemsPerPage ?? p.limit ?? 20,
      totalCount: p.totalCount ?? p.total ?? 0,
    };
  }
  return { currentPage: 1, itemsPerPage: 20, totalCount: 0 };
};

const marketsSlice = createSlice({
  name: "markets",
  initialState,
  reducers: {
    getMarketsList: () => {},

    getMarketsListSucceeded: (
      state: MarketsSliceState,
      action: PayloadAction<MarketsResponse>,
    ) => {
      if (action?.payload) {
        const rawData = Array.isArray(action.payload.data)
          ? action.payload.data
          : [];
        state.data = rawData.map(normalizeGoMarket);
        state.paginationResponse = parseTableMetaPagination(
          normalizeGoMarketsPagination(action.payload),
        );
      }
    },
  },
});

export const selectData = (state: MarketsSlice): TalonSingleMarketFixture[] =>
  state.markets.data;
export const selectTableMeta = (state: MarketsSlice): TableMetaSelector => {
  const { pagination, paginationResponse, filters, sorting } = state.markets;
  return { pagination, paginationResponse, filters, sorting };
};

export const { getMarketsList, getMarketsListSucceeded } = marketsSlice.actions;

export default marketsSlice.reducer;
