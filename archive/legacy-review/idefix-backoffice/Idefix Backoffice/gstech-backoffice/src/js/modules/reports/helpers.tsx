import React from "react";
import { ReportType } from "app/types";
import api from "js/core/api";
import { formatDataByKeys } from "js/core/components/table";
import { formatDate } from "js/core/helpers/formatDate";
import { formatMoneyFromCents } from "js/core/helpers/formatMoneyFromCents";
import isNaN from "lodash/isNaN";

export const REPORT_TYPES = [
  {
    key: "users",
    label: "Active users",
  },
  {
    key: "deposits",
    label: "Deposits",
  },
  {
    key: "deposits-summary",
    label: "Deposits summary",
  },
  {
    key: "dormant",
    label: "Dormant players",
  },
  {
    key: "game-turnover",
    label: "Game turnover",
  },
  {
    key: "license",
    label: "License",
  },
  {
    key: "pending-withdrawals",
    label: "Pending Withdrawals",
  },
  {
    key: "liabilities",
    label: "Player liabilities",
  },
  {
    key: "results",
    label: "Results",
  },
  {
    key: "withdrawals",
    label: "Withdrawals",
  },
  {
    key: "withdrawals-summary",
    label: "Withdrawals summary",
  },
  {
    key: "risk-status",
    label: "Risk status overview",
  },
  {
    key: "risk-transaction",
    label: "Risk transaction overview",
  },
];
export const REPORT_TYPE_KEYS = REPORT_TYPES.map(({ key }) => key);

export const format = (value: string, { type }: { type: string }) => {
  const val = value === "NaN" ? "-" : value === "Infinity" ? "∞" : value;
  return type === "total" ? <b>{val}</b> : val;
};

export const formatWithMargin = (title: string, { type }: { type: string }) =>
  type === "total" ? (
    <b>{title}</b>
  ) : (
    <span style={{ textAlign: "right" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↪&nbsp;{title}</span>
  );

export const exportFormat = (key: string) => (value: string, row: any) => (Number(row[key]) / 100).toFixed(2);

const keysToFormat = [
  { key: "timestamp", format: formatDate },
  { key: "rawAmount", format: formatMoneyFromCents },
];

export const fetchFormattedReport = async (type: ReportType, values: { brandId?: string; [key: string]: any }) => {
  return await api.reports.getReport(type, values).then(report => {
    const formattedReport = formatDataByKeys(report, keysToFormat);
    return formattedReport;
  });
};
