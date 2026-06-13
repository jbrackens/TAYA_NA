import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { parseTableMetaPagination } from "../utils/filters";
import { TalonPunterShort } from "../../types/punters.d";
import {
  TablePagination,
  TableMeta,
  TablePaginationResponse,
} from "../../types/filters.d";

export type UsersSliceState = {
  data: TalonPunterShort[];
  recentActivities: any[] | undefined;
  paginationResponse: TablePagination | {};
} & TableMeta;

export type UsersResponse = {
  data: TalonPunterShort[];
} & TablePaginationResponse;

export type UsersActivityResponse = any[];

export type UsersSlice = {
  users: UsersSliceState;
};

const initialState: UsersSliceState = {
  data: [],
  recentActivities: [] as any,
  pagination: {},
  paginationResponse: {},
  filters: {},
  sorting: {},
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    // Redux Toolkit allows us to write "mutating" logic in reducers. It
    // doesn't actually mutate the state because it uses the Immer library,
    // which detects changes to a "draft state" and produces a brand new
    // immutable state based off those changes
    getUsersList: () => {},

    getUsersListSucceeded: (
      state: UsersSliceState,
      action: PayloadAction<UsersResponse>,
    ) => {
      if (action?.payload) {
        const { data, ...rest } = action.payload;
        state.data = [...data];
        state.paginationResponse = parseTableMetaPagination(rest);
      }
    },

    getUserRecentActivities: () => {},

    getUserRecentActivitiesSucceeded: (
      state: UsersSliceState,
      action: PayloadAction<UsersActivityResponse>,
    ) => {
      if (action?.payload) {
        state.recentActivities = [...action.payload];
      }
    },

    resetUserRecentActivities: (state: UsersSliceState) => {
      state.recentActivities = undefined;
    },
  },
});

export const selectData = (state: UsersSlice): TalonPunterShort[] =>
  state.users.data;
export const selectTableMeta = (state: UsersSlice): any => {
  const { paginationResponse } = state.users;
  return { paginationResponse };
};
export const selectRecentActivities = (state: UsersSlice): any =>
  state.users.recentActivities;

export const {
  getUsersList,
  getUsersListSucceeded,
  getUserRecentActivities,
  getUserRecentActivitiesSucceeded,
  resetUserRecentActivities,
} = usersSlice.actions;

export default usersSlice.reducer;
