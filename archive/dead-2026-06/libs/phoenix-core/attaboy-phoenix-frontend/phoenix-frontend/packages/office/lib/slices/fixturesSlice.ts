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

const fixturesSlice = createSlice({
  name: "fixtures",
  initialState,
  reducers: {
    // Redux Toolkit allows us to write "mutating" logic in reducers. It
    // doesn't actually mutate the state because it uses the Immer library,
    // which detects changes to a "draft state" and produces a brand new
    // immutable state based off those changes
    getFixturesList: () => {},

    getFixturesListSucceeded: (
      state: FixturesSliceState,
      action: PayloadAction<FixturesResponse>,
    ) => {
      if (action?.payload) {
        const { data, ...rest } = action.payload;
        state.data = data;
        state.paginationResponse = parseTableMetaPagination(rest);
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
