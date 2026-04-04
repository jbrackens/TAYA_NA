import api from "../../core/api";
import { Filters } from "./paymentsSlice";
import { formatMoneyFromCents } from "../../core/helpers/formatMoneyFromCents";
import { ColumnProps, formatDataByKeys, getCsvHeaders } from "../../core/components/table";
import { formatDate } from "../../core/helpers/formatDate";

export const columns = [
  { label: "Created", name: "date", align: "left", type: "date", style: { minWidth: 164 } },
  { label: "Type", name: "type", align: "left", type: "text", style: { minWidth: 112 } },
  { label: "Status", name: "status", align: "left", type: "text", style: { minWidth: 112 } },
  { label: "Bonus", name: "bonus", align: "left", type: "text", style: { minWidth: 164 } },
  { label: "Amount", name: "amount", align: "left", type: "text", style: { minWidth: 112 } },
  { label: "Fee", name: "paymentFee", align: "left", type: "text", style: { minWidth: 92 } },
  { label: "Provider", name: "provider", align: "left", type: "text", style: { minWidth: 164 } },
  {
    label: "Account",
    name: "account",
    align: "left",
    type: "text",
    style: { minWidth: 164, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  },
  {
    label: "Transaction ID",
    name: "transactionId",
    align: "right",
    type: "text",
    style: { minWidth: 264, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  },
] as ColumnProps[];

const columnsToHeaders = [
  ...columns.filter(({ name }) => !["amount", "paymentFee"].includes(name)),
  {
    label: "Amount",
    name: "rawAmount",
  },
  {
    label: "Fee",
    name: "rawPaymentFee",
  },
] as ColumnProps[];

export const CSV_HEADERS = getCsvHeaders(columnsToHeaders);

const keysToFormat = [
  {
    key: "rawAmount",
    format: formatMoneyFromCents,
  },
  {
    key: "rawPaymentFee",
    format: formatMoneyFromCents,
  },
  {
    key: "date",
    format: formatDate,
  },
];

export const fetchFormattedPaymentTransactions = async (
  playerId: number,
  params: {
    status: Filters;
    pageSize?: number;
    text?: string;
  },
) => {
  const status = Object.entries(params.status)
    .filter(([_, isTruthy]) => isTruthy)
    .map(([status]) => status);

  return api.players.getPaymentTransactions(playerId, { ...params, status }).then(transactions => {
    const formattedTransactions = formatDataByKeys(transactions, keysToFormat);

    return formattedTransactions;
  });
};
