import React from "react";

import api from "@idefix-backoffice/idefix/api";
import { formatDate, formatMoneyFromCents } from "@idefix-backoffice/idefix/utils";
import { ReportType } from "@idefix-backoffice/idefix/types";
import { formatDataByKeys } from "@idefix-backoffice/idefix/components";

export const REPORT_TYPES = [
  {
    key: "users",
    label: "Active users"
  },
  {
    key: "deposits",
    label: "Deposits"
  },
  {
    key: "deposits-summary",
    label: "Deposits summary"
  },
  {
    key: "dormant",
    label: "Dormant players"
  },
  {
    key: "game-turnover",
    label: "Game turnover"
  },
  {
    key: "license",
    label: "License"
  },
  {
    key: "pending-withdrawals",
    label: "Pending Withdrawals"
  },
  {
    key: "liabilities",
    label: "Player liabilities"
  },
  {
    key: "results",
    label: "Results"
  },
  {
    key: "withdrawals",
    label: "Withdrawals"
  },
  {
    key: "withdrawals-summary",
    label: "Withdrawals summary"
  },
  {
    key: "risk-status",
    label: "Risk status overview"
  },
  {
    key: "risk-transaction",
    label: "Risk transaction overview"
  }
];
export const REPORT_TYPE_KEYS = REPORT_TYPES.map(({ key }) => key);

export const format = (value: string, { type }: { type: string }) => (type === "total" ? <b>{value}</b> : value);

export const formatWithMargin = (title: string, { type }: { type: string }) =>
  type === "total" ? (
    <b>{title}</b>
  ) : (
    <span style={{ textAlign: "right" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↪&nbsp;{title}</span>
  );

export const exportFormat = (key: string) => (value: string, row: any) => (Number(row[key]) / 100).toFixed(2);

const keysToFormat = [
  { key: "timestamp", format: formatDate },
  { key: "rawAmount", format: formatMoneyFromCents }
];

export const fetchFormattedReport = async (type: ReportType, values: { brandId?: string; [key: string]: any }) => {
  return await api.reports.getReport(type, values).then((report: any) => {
    const formattedReport = formatDataByKeys(report, keysToFormat);
    return formattedReport;
  });
};
