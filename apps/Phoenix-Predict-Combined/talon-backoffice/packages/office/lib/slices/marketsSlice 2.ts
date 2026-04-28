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

const marketsSlice = createSlice({
  name: "markets",
  initialState,
  reducers: {
    // Redux Toolkit allows us to write "mutating" logic in reducers. It
    // doesn't actually mutate the state because it uses the Immer library,
    // which detects changes to a "draft state" and produces a brand new
    // immutable state based off those changes
    getMarketsList: () => {},

    getMarketsListSucceeded: (
      state: MarketsSliceState,
      action: PayloadAction<MarketsResponse>,
    ) => {
      if (action?.payload) {
        const { data, ...rest } = action.payload;
        state.data = data;
        state.paginationResponse = parseTableMetaPagination(rest);
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
