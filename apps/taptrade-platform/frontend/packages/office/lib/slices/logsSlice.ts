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

type AuditPaginationResponse = Partial<TablePaginationResponse> &
  Partial<GoAuditPagination>;

export type AuditLogsAuditLogsResponse = {
  data: TalonAuditLogs;
  items?: TalonAuditLogs;
  pagination?: AuditPaginationResponse;
} & TablePaginationResponse;

const normalizeGoAuditRow = (row: unknown): TalonAuditLog => {
  if (!row || typeof row !== "object") {
    return {};
  }
  const source = row as Record<string, unknown>;
  const normalized: TalonAuditLog = { ...source };
  if (typeof source.actor_id === "string" && normalized.actorId === undefined) {
    normalized.actorId = source.actor_id;
  }
  if (typeof source.entity_type === "string") {
    if (normalized.category === undefined) {
      normalized.category = source.entity_type;
    }
    if (normalized.type === undefined) {
      normalized.type = source.entity_type;
    }
  }
  if (typeof source.entity_id === "string" && normalized.targetId === undefined) {
    normalized.targetId = source.entity_id;
  }
  if (source.old_value !== undefined && normalized.dataBefore === undefined) {
    normalized.dataBefore =
      source.old_value && typeof source.old_value === "object"
        ? (source.old_value as Record<string, unknown>)
        : undefined;
  }
  if (source.new_value !== undefined && normalized.dataAfter === undefined) {
    normalized.dataAfter =
      source.new_value && typeof source.new_value === "object"
        ? (source.new_value as Record<string, unknown>)
        : undefined;
  }
  if (typeof source.created_at === "string" && normalized.createdAt === undefined) {
    normalized.createdAt = source.created_at;
  }
  if (typeof source.ip_address === "string") {
    normalized.ipAddress = source.ip_address;
  }
  return normalized;
};

const normalizeGoPagination = (
  pagination: AuditPaginationResponse | undefined,
): TablePaginationResponse => {
  if (!pagination || typeof pagination !== "object") {
    return { currentPage: 1, itemsPerPage: 20, totalCount: 0 };
  }
  return {
    currentPage: pagination.currentPage || pagination.page || 1,
    itemsPerPage: pagination.itemsPerPage || pagination.limit || 20,
    totalCount: pagination.totalCount ?? pagination.total ?? 0,
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
