import React from "react";
import format from "date-fns/format";
import isNil from "lodash/fp/isNil";

import api from "@idefix-backoffice/idefix/api";
import { ColumnProps, formatDataByKeys, getCsvHeaders } from "@idefix-backoffice/idefix/components";
import { formatMoneyFromCents } from "@idefix-backoffice/idefix/utils";

export const renderClosedColumnAction =
  (onClose: (roundId: number) => void, onRefund: (roundId: number) => void) =>
  (closed: boolean, { roundId, date }: { roundId: number; date: string }) => {
    if (isNil(closed)) {
      return null;
    }

    if (closed) {
      // return <RoundClosedIcon color="primary" />;
    }

    // if (moment(date).add(10, "minute").isBefore(moment())) {
    //   return <CloseRoundMenu onClose={() => onClose(roundId)} onRefund={() => onRefund(roundId)} />;
    // }

    return null;
  };

export const formatAmount = (key: string) => (value: string, row: any, exportFormat: any) => {
  if (exportFormat) {
    return Number(row[key] / 100).toFixed(2);
  }

  if (row[key] > 0) {
    return <b>{value}</b>;
  }

  if (row[key] < 0) {
    return <b style={{ color: "#F2453D" }}>{value}</b>;
  }
  return <span style={{ color: "#616161" }}>{value}</span>;
};

export const columns = [
  {
    label: "Id",
    name: "transactionId",
    align: "left",
    type: "text",
    style: { minWidth: 96 }
  },
  {
    label: "Time",
    name: "date",
    align: "left",
    type: "date",
    style: { minWidth: 124 }
  },
  {
    label: "Description",
    name: "description",
    align: "left",
    type: "text",
    style: { minWidth: 172 }
  },
  {
    label: "Type",
    name: "type",
    align: "left",
    type: "text",
    style: { minWidth: 112 }
  },
  {
    label: "Bonus amount",
    name: "bonusAmount",
    align: "right",
    type: "custom",
    style: { minWidth: 96 },
    format: formatAmount("rawBonusAmount")
  },
  {
    label: "Bonus balance",
    name: "bonusBalance",
    align: "right",
    type: "custom",
    style: { minWidth: 96 },
    format: formatAmount("rawBonusBalance")
  },
  {
    label: "Real amount",
    name: "amount",
    align: "right",
    type: "custom",
    style: { minWidth: 96 },
    format: formatAmount("rawAmount")
  },
  {
    label: "Real balance",
    name: "realBalance",
    align: "right",
    type: "text",
    style: { minWidth: 96 }
  },
  {
    label: "Transaction",
    name: "externalTransactionId",
    align: "right",
    type: "text",
    style: {
      minWidth: 264,
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis"
    }
  },
  {
    label: "Round",
    name: "externalRoundId",
    align: "right",
    type: "text",
    style: {
      minWidth: 264,
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis"
    }
  },
  {
    label: "Bonus",
    name: "bonus",
    align: "right",
    type: "text",
    style: {
      minWidth: 172,
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis"
    }
  }
] as ColumnProps[];

const columnsToHeaders = [
  ...columns.filter(({ name }) => !["bonusAmount", "bonusBalance", "amount", "realBalance"].includes(name)),
  {
    label: "Bet",
    name: "rawBetAmount"
  },
  {
    label: "Win",
    name: "rawWinAmount"
  },
  {
    label: "Bonus Amount",
    name: "rawBonusAmount"
  },
  {
    label: "Bonus Balance",
    name: "rawBonusBalance"
  },
  {
    label: "Real Balance",
    name: "rawRealBalance"
  },
  {
    label: "Real Amount",
    name: "rawAmount"
  },
  {
    label: "Closed",
    name: "closed"
  }
] as ColumnProps[];

const keysToFormat = [
  {
    key: "rawRealBalance",
    format: formatMoneyFromCents
  },
  {
    key: "rawBonusBalance",
    format: formatMoneyFromCents
  },
  {
    key: "rawAmount",
    format: formatMoneyFromCents
  },
  {
    key: "rawBonusAmount",
    format: formatMoneyFromCents
  },
  {
    key: "date",
    format: (value: string) => format(new Date(value), "dd.MM.yyyy HH:mm:ss")
  }
];

export const CSV_HEADERS = getCsvHeaders(columnsToHeaders);

export const fetchFormattedTransactions = async (
  playerId: number,
  params: {
    startDate: string;
    endDate: string;
    pageIndex?: number;
    pageSize?: number;
    text?: string;
  }
) => {
  return api.players.getTransactions(playerId, params).then(transactions => {
    const rawTransactions = transactions.map(item => {
      const rawBetAmount =
        item.type === "Bet" ? ((Number(item.rawAmount) + Number(item.rawBonusAmount)) / 100).toFixed(2) : "";

      const rawWinAmount =
        item.type === "Win" ? ((Number(item.rawAmount) + Number(item.rawBonusAmount)) / 100).toFixed(2) : "";

      return { ...item, rawBetAmount, rawWinAmount };
    });

    const formattedTransactions = formatDataByKeys(rawTransactions, keysToFormat);

    return formattedTransactions;
  });
};
