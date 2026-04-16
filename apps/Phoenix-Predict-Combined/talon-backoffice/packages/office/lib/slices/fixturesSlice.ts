import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { parseTableMetaPagination } from "../utils/filters";
import { TalonFixture } from "../../types/fixture.d";
import {
  TablePaginationResponse,
  TableMeta,
  TableMetaSelector,
  TablePagination,
} from "../../types/filters";

export type FixturesSliceState = {
  data: TalonFixture[];
  paginationResponse: TablePagination | {};
} & TableMeta;

export type FixturesResponse = {
  data: TalonFixture[];
} & TablePaginationResponse;

export type FixturesSlice = {
  fixtures: FixturesSliceState;
};

const initialState: FixturesSliceState = {
  data: [],
  pagination: {},
  paginationResponse: {},
  filters: {},
  sorting: {},
};

// Map Go fixture status to Talon FixtureStatusEnum values
const mapGoFixtureStatus = (status: string): string => {
  switch ((status || "").toLowerCase()) {
    case "scheduled": return "PRE_GAME";
    case "live": return "IN_PLAY";
    case "completed": return "POST_GAME";
    case "cancelled": return "GAME_ABANDONED";
    case "postponed": return "UNKNOWN";
    case "abandoned": return "GAME_ABANDONED";
    default: return "UNKNOWN";
  }
};

// Normalize Go snake_case Event into Talon camelCase TalonFixture
const normalizeGoFixture = (raw: any): TalonFixture => {
  if (!raw || typeof raw !== "object") return raw;
  // Detect Go format by checking for snake_case fields
  const isGoFormat = "event_id" in raw || "home_team" in raw || "scheduled_start" in raw;
  if (!isGoFormat) return raw as TalonFixture;

  return {
    fixtureId: raw.event_id ?? raw.fixtureId ?? "",
    fixtureName: raw.name ?? raw.fixtureName ?? "",
    sport: { id: raw.sport ?? "", name: raw.sport ?? "" },
    status: mapGoFixtureStatus(raw.status),
    startTime: raw.scheduled_start ?? raw.startTime ?? "",
    isLive: raw.status === "live",
    competitors: [
      ...(raw.home_team ? [{ competitorId: "home", abbreviation: "", name: raw.home_team, qualifier: "home" }] : []),
      ...(raw.away_team ? [{ competitorId: "away", abbreviation: "", name: raw.away_team, qualifier: "away" }] : []),
    ],
    score: raw.live_score
      ? { home: raw.live_score.home ?? 0, away: raw.live_score.away ?? 0 }
      : { home: 0, away: 0 },
    markets: [],
    marketsTotalCount: 0,
    scoreHistory: [],
  } as any;
};

// Normalize Go pagination {page, limit, total} to Talon {currentPage, itemsPerPage, totalCount}
const normalizeGoPagination = (payload: any): any => {
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

const fixturesSlice = createSlice({
  name: "fixtures",
  initialState,
  reducers: {
    getFixturesList: () => {},

    getFixturesListSucceeded: (
      state: FixturesSliceState,
      action: PayloadAction<FixturesResponse>,
    ) => {
      if (action?.payload) {
        const rawData = Array.isArray(action.payload.data) ? action.payload.data : [];
        state.data = rawData.map(normalizeGoFixture);
        state.paginationResponse = parseTableMetaPagination(normalizeGoPagination(action.payload));
      }
    },
  },
});

export const selectData = (state: FixturesSlice): TalonFixture[] =>
  state.fixtures.data;
export const selectTableMeta = (state: FixturesSlice): TableMetaSelector => {
  const { pagination, paginationResponse, filters, sorting } = state.fixtures;
  return { pagination, paginationResponse, filters, sorting };
};

export const {
  getFixturesList,
  getFixturesListSucceeded,
} = fixturesSlice.actions;

export default fixturesSlice.reducer;
