import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { parseTableMetaPagination } from "../utils/filters";
import { normalizeRecentActivities } from "../utils/recent-activities";
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

export type UsersActivityResponse = any;

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

/**
 * Parse an ISO date or datetime string into { year, month, day } using the
 * date portion only (no timezone drift from local Date constructors).
 * Returns undefined for missing or unparseable values.
 */
const parseDateOfBirth = (
  value: unknown,
): { year: number; month: number; day: number } | undefined => {
  if (typeof value !== "string" || !value) return undefined;
  // Match the date portion of ISO strings: "1990-03-15" or "1990-03-15T00:00:00Z"
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return undefined;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return { year, month, day };
};

export const normalizeGoUser = (raw: any): TalonPunterShort => {
  if (!raw || typeof raw !== "object") {
    return raw;
  }
  if ("user_id" in raw || "created_at" in raw) {
    return {
      ...raw,
      id: raw.user_id ?? raw.id,
      userId: raw.user_id ?? raw.userId ?? raw.id,
      username: raw.username ?? "",
      email: raw.email ?? "",
      status: raw.status ?? "",
      firstName: raw.first_name ?? raw.firstName ?? "",
      lastName: raw.last_name ?? raw.lastName ?? "",
      dateOfBirth:
        parseDateOfBirth(raw.date_of_birth) ?? raw.dateOfBirth ?? undefined,
      createdAt: raw.created_at ?? raw.createdAt,
    } as TalonPunterShort;
  }
  return raw as TalonPunterShort;
};

const normalizeGoUsersPagination = (payload: any): any => {
  if (payload?.pagination && typeof payload.pagination === "object") {
    const p = payload.pagination;
    return {
      currentPage: p.currentPage ?? p.page ?? 1,
      itemsPerPage: p.itemsPerPage ?? p.limit ?? 20,
      totalCount: p.totalCount ?? p.total ?? 0,
    };
  }
  return {
    currentPage: payload?.currentPage ?? 1,
    itemsPerPage: payload?.itemsPerPage ?? 20,
    totalCount: payload?.totalCount ?? 0,
  };
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    getUsersList: () => {},

    getUsersListSucceeded: (
      state: UsersSliceState,
      action: PayloadAction<UsersResponse>,
    ) => {
      if (action?.payload) {
        const rawData = Array.isArray(action.payload.data)
          ? action.payload.data
          : [];
        state.data = rawData.map(normalizeGoUser);
        state.paginationResponse = parseTableMetaPagination(
          normalizeGoUsersPagination(action.payload),
        );
      }
    },

    getUserRecentActivities: () => {},

    getUserRecentActivitiesSucceeded: (
      state: UsersSliceState,
      action: PayloadAction<UsersActivityResponse>,
    ) => {
      if (action?.payload) {
        state.recentActivities = normalizeRecentActivities(action.payload);
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
