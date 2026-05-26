import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  TableMetaSelector,
  TablePagination,
  TablePaginationResponse,
} from "../../types/filters";
import { parseTableMetaPagination } from "../utils/filters";

export type FixturesSliceState = {
  data: any[];
  paginationResponse: TablePagination;
  pagination: Record<string, unknown>;
  filters: Record<string, unknown>;
  sorting: Record<string, unknown>;
};

export type FixturesResponse = {
  data?: any[];
  pagination?: unknown;
};

export type FixturesSlice = {
  retiredEventRows: FixturesSliceState;
};

const initialState: FixturesSliceState = {
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

const retiredEventRowsSlice = createSlice({
  name: "retiredEventRows",
  initialState,
  reducers: {
    getFixturesList: () => {},

    getFixturesListSucceeded: (
      state: FixturesSliceState,
      action: PayloadAction<FixturesResponse>,
    ) => {
      state.data = Array.isArray(action.payload?.data)
        ? action.payload.data
        : [];
      state.paginationResponse = parseTableMetaPagination(
        action.payload?.pagination as TablePaginationResponse,
      );
    },
  },
});

export const selectData = (state: FixturesSlice): any[] =>
  state.retiredEventRows.data;

export const selectTableMeta = (state: FixturesSlice): TableMetaSelector => {
  const { pagination, paginationResponse, filters, sorting } =
    state.retiredEventRows;
  return { pagination, paginationResponse, filters, sorting };
};

export const { getFixturesList, getFixturesListSucceeded } =
  retiredEventRowsSlice.actions;

export default retiredEventRowsSlice.reducer;
