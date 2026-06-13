import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { parseTableMetaPagination } from "../utils/filters";
import {
  TablePagination,
  TableMeta,
  TablePaginationResponse,
} from "../../types/filters.d";
import { MarketCategories } from "../../types/market";
import { SportType } from "../../types/sport";

export type MarketCategoriesSlice = {
  marketCategories: MarketCategoriesSliceState;
};

export type MarketCategoriesSliceState = {
  categories: MarketCategoriesType;
  sports: Array<SportType>;
};

const initialState: MarketCategoriesSliceState = {
  categories: {
    data: [],
    pagination: {},
    paginationResponse: {},
    filters: {},
    sorting: {},
  },
  sports: [],
};

export type MarketCategoriesType = {
  data: MarketCategories;
  paginationResponse: TablePagination | {};
} & TableMeta;

export type MarketCategoriesResponse = {
  data: MarketCategories;
} & TablePaginationResponse;

const marketCategoriesSlice = createSlice({
  name: "marketCategories",
  initialState,
  reducers: {
    getMarketCategoriesSucceeded: (
      state: MarketCategoriesSliceState,
      action: PayloadAction<MarketCategoriesResponse>,
    ) => {
      if (action?.payload) {
        const { data, ...rest } = action.payload;
        state.categories.data = [...data];
        state.categories.paginationResponse = parseTableMetaPagination(rest);
      }
    },

    clearMarketCategories: (state: MarketCategoriesSliceState) => {
      state.categories.data = [];
      state.categories.paginationResponse = [];
    },

    getSportsSucceeded: (
      state: MarketCategoriesSliceState,
      action: PayloadAction<Array<SportType>>,
    ) => {
      if (action?.payload) {
        state.sports = action.payload;
      }
    },
  },
});

export const selectMarketCategoriesData = (state: MarketCategoriesSlice) =>
  state.marketCategories.categories.data;

export const selectMarketCategoriesTableMeta = (
  state: MarketCategoriesSlice,
) => {
  const {
    pagination,
    paginationResponse,
    filters,
    sorting,
  } = state.marketCategories.categories;
  return { pagination, paginationResponse, filters, sorting };
};

export const selectSportsData = (state: MarketCategoriesSlice) =>
  state.marketCategories.sports;

export const {
  getMarketCategoriesSucceeded,
  clearMarketCategories,
  getSportsSucceeded,
} = marketCategoriesSlice.actions;

export default marketCategoriesSlice.reducer;
