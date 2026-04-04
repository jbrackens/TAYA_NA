import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TalonAuditLog, TalonAuditLogs } from "../../types/logs";
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

export type GoAuditPagination = {
  page?: number;
  limit?: number;
  total?: number;
};

export type AuditLogsAuditLogsResponse = {
  data: TalonAuditLogs;
  items?: TalonAuditLogs;
  pagination?: TablePaginationResponse | GoAuditPagination;
} & TablePaginationResponse;

const normalizeGoAuditRow = (row: any): TalonAuditLog => {
  if (!row || typeof row !== "object") {
    return row;
  }
  const normalized: TalonAuditLog = { ...row };
  if (row.actor_id !== undefined && normalized.actorId === undefined) {
    normalized.actorId = row.actor_id;
  }
  if (row.entity_type !== undefined) {
    if (normalized.category === undefined) {
      normalized.category = row.entity_type;
    }
    if (normalized.type === undefined) {
      normalized.type = row.entity_type;
    }
  }
  if (row.entity_id !== undefined && normalized.targetId === undefined) {
    normalized.targetId = row.entity_id;
  }
  if (row.old_value !== undefined && normalized.dataBefore === undefined) {
    normalized.dataBefore = typeof row.old_value === "object" ? row.old_value : undefined;
  }
  if (row.new_value !== undefined && normalized.dataAfter === undefined) {
    normalized.dataAfter = typeof row.new_value === "object" ? row.new_value : undefined;
  }
  if (row.created_at !== undefined && normalized.createdAt === undefined) {
    normalized.createdAt = row.created_at;
  }
  if (row.ip_address !== undefined) {
    normalized.ipAddress = row.ip_address;
  }
  return normalized;
};

const normalizeGoPagination = (
  pagination: GoAuditPagination | TablePaginationResponse | undefined,
): TablePaginationResponse => {
  if (!pagination || typeof pagination !== "object") {
    return { currentPage: 1, itemsPerPage: 20, totalCount: 0 };
  }
  const p = pagination as any;
  return {
    currentPage: p.currentPage || p.page || 1,
    itemsPerPage: p.itemsPerPage || p.limit || 20,
    totalCount: p.totalCount ?? p.total ?? 0,
  };
};

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
        const payload = action.payload as AuditLogsAuditLogsResponse;
        const rawData = Array.isArray(payload.data) && payload.data.length > 0
          ? payload.data
          : Array.isArray(payload.items)
            ? payload.items
            : [];
        const data = rawData.map(normalizeGoAuditRow);
        const pagination = payload.pagination
          ? normalizeGoPagination(payload.pagination)
          : {
              currentPage: payload.currentPage || 1,
              itemsPerPage: payload.itemsPerPage || 10,
              totalCount: payload.totalCount || data.length,
            };
        state.data = [...data];
        state.paginationResponse = parseTableMetaPagination(pagination);
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
