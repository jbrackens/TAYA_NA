import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  TalonPunter,
  TalonPunterSessionHistory,
  TalonPunterWallet,
  TalonPunterNotes,
  LimitsHistoryData,
  CoolOffsHistoryData,
} from "../../types/punters.d";
import { TalonAuditLogs } from "../../types/logs.d";
import { parseTableMetaPagination } from "../utils/filters";
import {
  TablePagination,
  TableMeta,
  TablePaginationResponse,
} from "../../types/filters.d";
import { TalonBets } from "../../types/bets.d";

export type UsersDetailsSliceState = {
  basic: TalonPunter;
  recentActivities: any[];
  betsHistory: UsersDetailsBetsHistory;
  walletHistory: UsersDetailsWalletHistory;
  auditLogs: UsersDetailsAuditLogs;
  sessionHistory: UsersDetailsSessionHistory;
  notes: UsersDetailsNotes;
  updateNotes: boolean;
  limitsHistory: UsersLimitsHistory;
  coolOffsHistory: UsersCoolOffsHistory;
};

export type UsersDetailsBetsHistory = {
  data: TalonBets;
  paginationResponse: TablePagination | {};
} & TableMeta;

export type UsersDetailsBetsHistoryResponse = {
  data: TalonBets;
} & TablePaginationResponse;

export type UsersDetailsWalletHistory = {
  data: TalonPunterWallet;
  paginationResponse: TablePagination | {};
} & TableMeta;

export type UsersDetailsWalletHistoryResponse = {
  data: TalonPunterWallet;
} & TablePaginationResponse;

export type UsersDetailsAuditLogs = {
  data: TalonAuditLogs;
  paginationResponse: TablePagination | {};
} & TableMeta;

export type UsersDetailsAuditLogsResponse = {
  data: TalonAuditLogs;
} & TablePaginationResponse;

export type UsersDetailsSessionHistory = {
  data: TalonPunterSessionHistory;
  paginationResponse: TablePagination | {};
} & TableMeta;

export type UsersDetailsSessionHistoryResponse = {
  data: TalonPunterSessionHistory;
} & TablePaginationResponse;

export type UsersDetailsNotes = {
  data: TalonPunterNotes;
  paginationResponse: TablePagination | {};
} & TableMeta;

export type UsersDetailsNotesResponse = {
  data: TalonPunterNotes;
} & TablePaginationResponse;

export type UsersLimitsHistory = {
  data: Array<LimitsHistoryData>;
  paginationResponse: TablePagination | {};
} & TableMeta;

export type UsersCoolOffsHistory = {
  data: Array<CoolOffsHistoryData>;
  paginationResponse: TablePagination | {};
} & TableMeta;

const initialState: UsersDetailsSliceState = {
  basic: {} as TalonPunter,
  recentActivities: [] as any,
  betsHistory: {
    data: [],
    pagination: {},
    paginationResponse: {},
    filters: {},
    sorting: {},
  },
  walletHistory: {
    data: [],
    pagination: {},
    paginationResponse: {},
    filters: {},
    sorting: {},
  },
  auditLogs: {
    data: [],
    pagination: {},
    paginationResponse: {},
    filters: {},
    sorting: {},
  },
  sessionHistory: {
    data: [],
    pagination: {},
    paginationResponse: {},
    filters: {},
    sorting: {},
  },
  notes: {
    data: [],
    pagination: {},
    paginationResponse: {},
    filters: {},
    sorting: {},
  },
  updateNotes: false,
  limitsHistory: {
    data: [],
    pagination: {},
    paginationResponse: {},
    filters: {},
    sorting: {},
  },
  coolOffsHistory: {
    data: [],
    pagination: {},
    paginationResponse: {},
    filters: {},
    sorting: {},
  },
};

export type UsersDetailsSlice = {
  usersDetails: UsersDetailsSliceState;
};

const usersDetailsSlice = createSlice({
  name: "usersDetails",
  initialState,
  reducers: {
    getUserDetails: () => {},

    getUserDetailsSucceeded: (
      state: UsersDetailsSliceState,
      action: PayloadAction<TalonPunter>,
    ) => {
      if (action?.payload) {
        state.basic = { ...action.payload };
      }
    },

    getUserRecentActivities: () => {},

    getUserRecentActivitiesSucceeded: (
      state: UsersDetailsSliceState,
      action: PayloadAction<any>,
    ) => {
      if (action?.payload) {
        state.recentActivities = [...action.payload];
      }
    },

    getUserBets: () => {},

    getUserBetsSucceeded: (
      state: UsersDetailsSliceState,
      action: PayloadAction<UsersDetailsBetsHistoryResponse>,
    ) => {
      if (action?.payload) {
        const { data, ...rest } = action.payload;
        state.betsHistory.data = [...data];
        state.betsHistory.paginationResponse = parseTableMetaPagination(rest);
      }
    },

    getUserWallet: () => {},

    getUserWalletSucceeded: (
      state: UsersDetailsSliceState,
      action: PayloadAction<UsersDetailsWalletHistoryResponse>,
    ) => {
      if (action?.payload) {
        const { data, ...rest } = action.payload;
        state.walletHistory.data = [...data];
        state.walletHistory.paginationResponse = parseTableMetaPagination(rest);
      }
    },

    getUserAuditLogs: () => {},

    getUserAuditLogsSucceeded: (
      state: UsersDetailsSliceState,
      action: PayloadAction<UsersDetailsAuditLogsResponse>,
    ) => {
      if (action?.payload) {
        const { data, ...rest } = action.payload;
        state.auditLogs.data = [...data];
        state.auditLogs.paginationResponse = parseTableMetaPagination(rest);
      }
    },

    getUserSessionHistory: () => {},

    getUserSessionHistorySucceeded: (
      state: UsersDetailsSliceState,
      action: PayloadAction<UsersDetailsSessionHistoryResponse>,
    ) => {
      if (action?.payload) {
        const { data, ...rest } = action.payload;
        state.sessionHistory.data = [...data];
        state.sessionHistory.paginationResponse = parseTableMetaPagination(
          rest,
        );
      }
    },

    getUserNotes: () => {},

    setUserNotesUpdate: (
      state: UsersDetailsSliceState,
      action: PayloadAction<boolean>,
    ) => {
      state.updateNotes = action.payload;
    },

    getUserNotesSucceeded: (
      state: UsersDetailsSliceState,
      action: PayloadAction<UsersDetailsNotesResponse>,
    ) => {
      if (action?.payload) {
        const { data, ...rest } = action.payload;

        state.notes.data = [...data];
        state.notes.paginationResponse = parseTableMetaPagination(rest);
      }
    },

    getUserLimitsHistory: () => {},

    getUserLimitsHistorySucceeded: (
      state: UsersDetailsSliceState,
      action: PayloadAction<any>,
    ) => {
      if (action?.payload) {
        const { data, ...rest } = action.payload;

        state.limitsHistory.data = [...data];
        state.limitsHistory.paginationResponse = parseTableMetaPagination(rest);
      }
    },

    getUserCoolOffsHistory: () => {},

    getUserCoolOffsHistorySucceeded: (
      state: UsersDetailsSliceState,
      action: PayloadAction<any>,
    ) => {
      if (action?.payload) {
        const { data, ...rest } = action.payload;

        state.coolOffsHistory.data = [...data];
        state.coolOffsHistory.paginationResponse = parseTableMetaPagination(
          rest,
        );
      }
    },
  },
});

export const selectBasicData = (state: UsersDetailsSlice) =>
  state.usersDetails.basic;
export const selectRecentActivities = (state: UsersDetailsSlice) =>
  state.usersDetails.recentActivities;

export const selectBetsData = (state: UsersDetailsSlice) =>
  state.usersDetails.betsHistory.data;
export const selectBetsTableMeta = (state: UsersDetailsSlice) => {
  const {
    pagination,
    paginationResponse,
    filters,
    sorting,
  } = state.usersDetails.betsHistory;
  return { pagination, paginationResponse, filters, sorting };
};

export const selectWalletData = (state: UsersDetailsSlice) =>
  state.usersDetails.walletHistory.data;
export const selectWalletTableMeta = (state: UsersDetailsSlice) => {
  const {
    pagination,
    paginationResponse,
    filters,
    sorting,
  } = state.usersDetails.walletHistory;
  return { pagination, paginationResponse, filters, sorting };
};

export const selectAuditLogsData = (state: UsersDetailsSlice) =>
  state.usersDetails.auditLogs.data;
export const selectAuditLogsTableMeta = (state: UsersDetailsSlice) => {
  const {
    pagination,
    paginationResponse,
    filters,
    sorting,
  } = state.usersDetails.auditLogs;
  return { pagination, paginationResponse, filters, sorting };
};

export const selectSessionHistoryData = (state: UsersDetailsSlice) =>
  state.usersDetails.sessionHistory.data;
export const selectSessionHistoryTableMeta = (state: UsersDetailsSlice) => {
  const {
    pagination,
    paginationResponse,
    filters,
    sorting,
  } = state.usersDetails.sessionHistory;
  return { pagination, paginationResponse, filters, sorting };
};

export const selectNotesData = (state: UsersDetailsSlice) =>
  state.usersDetails.notes.data;
export const selectUpdateNotes = (state: UsersDetailsSlice) =>
  state.usersDetails.updateNotes;
export const selectNotesTableMeta = (state: UsersDetailsSlice) => {
  const {
    pagination,
    paginationResponse,
    filters,
    sorting,
  } = state.usersDetails.notes;
  return { pagination, paginationResponse, filters, sorting };
};

export const selectLimitsHistoryData = (state: UsersDetailsSlice) =>
  state.usersDetails.limitsHistory.data;
export const selectLimitsHistoryTableMeta = (state: UsersDetailsSlice) => {
  const {
    pagination,
    paginationResponse,
    filters,
    sorting,
  } = state.usersDetails.limitsHistory;
  return { pagination, paginationResponse, filters, sorting };
};

export const selectCoolOffsHistoryData = (state: UsersDetailsSlice) =>
  state.usersDetails.coolOffsHistory.data;
export const selectCoolOffsHistoryTableMeta = (state: UsersDetailsSlice) => {
  const {
    pagination,
    paginationResponse,
    filters,
    sorting,
  } = state.usersDetails.coolOffsHistory;
  return { pagination, paginationResponse, filters, sorting };
};

export const {
  getUserDetails,
  getUserDetailsSucceeded,
  getUserRecentActivities,
  getUserRecentActivitiesSucceeded,
  getUserBets,
  getUserBetsSucceeded,
  getUserWallet,
  getUserWalletSucceeded,
  getUserAuditLogs,
  getUserAuditLogsSucceeded,
  getUserSessionHistory,
  getUserSessionHistorySucceeded,
  getUserNotes,
  setUserNotesUpdate,
  getUserNotesSucceeded,
  getUserLimitsHistorySucceeded,
  getUserLimitsHistory,
  getUserCoolOffsHistorySucceeded,
  getUserCoolOffsHistory,
} = usersDetailsSlice.actions;

export default usersDetailsSlice.reducer;
