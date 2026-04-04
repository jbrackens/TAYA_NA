import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TalonAuditLogs } from "../../types/logs";
import { parseTableMetaPagination } from "../utils/filters";
import {
  TablePagination,
  TableMeta,
  TablePaginationResponse,
} from "../../types/filters";

export type AuditLogsSliceState = {
  data: TalonAuditLogs;
  paginationResponse: TablePagination | {};
} & TableMeta;

export type AuditLogsAuditLogsResponse = {
  data: TalonAuditLogs;
} & TablePaginationResponse;

const initialState: AuditLogsSliceState = {
  data: [],
  pagination: {},
  paginationResponse: {},
  filters: {},
  sorting: {},
};

export type AuditLogsSlice = {
  logs: AuditLogsSliceState;
};

const auditLogsSlice = createSlice({
  name: "logs",
  initialState,
  reducers: {
    getList: () => {},

    getListSucceeded: (
      state: AuditLogsSliceState,
      action: PayloadAction<AuditLogsAuditLogsResponse>,
    ) => {
      if (action?.payload) {
        const { data, ...rest } = action.payload;
        state.data = [...data];
        state.paginationResponse = parseTableMetaPagination(rest);
      }
    },
  },
});

export const selectData = (state: AuditLogsSlice) => state.logs.data;
export const selectTableMeta = (state: AuditLogsSlice) => {
  const { pagination, paginationResponse, filters, sorting } = state.logs;
  return { pagination, paginationResponse, filters, sorting };
};

export const { getList, getListSucceeded } = auditLogsSlice.actions;

export default auditLogsSlice.reducer;
