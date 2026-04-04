import React, { ChangeEvent, useCallback } from "react";
import Box from "@material-ui/core/Box";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";

import Table, { Column, ColumnProps, getSearchByKeys } from "../../../core/components/table";
import { format, formatWithMargin } from "../helpers";
import Search from "../../../core/components/search";
import { DownloadCsvButton, ScreenShotButton } from "../../../core/components/button/Button";
import useSearch from "../../../core/hooks/useSearch";
import { formatMoneyFromCents } from "../../../core/helpers/formatMoneyFromCents";
import { createColumnsToCsv } from "../../../core/components/table/helpers";

const useStyles = makeStyles(theme =>
  createStyles({
    table: {
      minWidth: 1318,
    },
  }),
);

const columns = [
  {
    label: "Title",
    name: "title",
    align: "left",
    type: "custom",
    format: formatWithMargin,
    style: { minWidth: 138 },
  },
  {
    label: "Start Liability",
    name: "startBalance",
    align: "right",
    type: "custom",
    format,
    style: { minWidth: 118 },
  },
  {
    label: "Deposits",
    name: "deposits",
    align: "right",
    type: "custom",
    format,
    style: { minWidth: 118 },
  },
  {
    label: "Withdrawals",
    name: "withdrawals",
    align: "right",
    type: "custom",
    format,
    style: { minWidth: 118 },
  },
  {
    label: "Bets",
    name: "bets",
    align: "right",
    type: "custom",
    format,
    style: { minWidth: 118 },
  },
  {
    label: "Wins",
    name: "wins",
    align: "right",
    type: "custom",
    format,
    style: { minWidth: 118 },
  },
  {
    label: "Bonus to Real",
    name: "turnToReal",
    align: "right",
    type: "custom",
    format,
    style: { minWidth: 118 },
  },
  {
    label: "Free spins",
    name: "freespins",
    align: "right",
    type: "custom",
    format,
    style: { minWidth: 118 },
  },
  {
    label: "Compensations",
    name: "compensations",
    align: "right",
    type: "custom",
    format,
    style: { minWidth: 118 },
  },
  {
    label: "Corrections",
    name: "corrections",
    align: "right",
    type: "custom",
    format,
    style: { minWidth: 118 },
  },
  {
    label: "End Liability",
    name: "endBalance",
    align: "right",
    type: "custom",
    format,
    style: { minWidth: 118 },
  },
] as ColumnProps[];

const CSV_HEADERS = createColumnsToCsv(
  columns,
  [
    "startBalance",
    "deposits",
    "withdrawals",
    "bets",
    "wins",
    "turnToReal",
    "freespins",
    "compensations",
    "corrections",
    "endBalance",
  ],
  [
    { label: "Start Liability", name: "rawStartBalance" },
    { label: "Deposits", name: "rawDeposits" },
    { label: "Withdrawals", name: "rawWithdrawals" },
    { label: "Bets", name: "rawBets" },
    { label: "Wins", name: "rawWins" },
    { label: "Bonus to", name: "rawTurnToReal" },
    { label: "Free spins", name: "rawFreespins" },
    { label: "Compensations", name: "rawCompensations" },
    { label: "Corrections", name: "rawCorrections" },
    { label: "End Liability", name: "rawEndBalance" },
  ],
);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [
  { key: "rawStartBalance", format: formatMoneyFromCents },
  { key: "rawDeposits", format: formatMoneyFromCents },
  { key: "rawWithdrawals", format: formatMoneyFromCents },
  { key: "rawBets", format: formatMoneyFromCents },
  { key: "rawWins", format: formatMoneyFromCents },
  { key: "rawTurnToReal", format: formatMoneyFromCents },
  { key: "rawFreespins", format: formatMoneyFromCents },
  { key: "rawCompensations", format: formatMoneyFromCents },
  { key: "rawCorrections", format: formatMoneyFromCents },
  { key: "rawEndBalance", format: formatMoneyFromCents },
];

export default ({ items, isLoading }: { items: any[]; isLoading: boolean }) => {
  const classes = useStyles();
  const { query, setQuery, results } = useSearch<any>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Liabilities</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={
          <>
            <ScreenShotButton />
            <DownloadCsvButton
              headers={CSV_HEADERS}
              data={results}
              disabled={isEmpty}
              keysToFormat={keysToFormat}
              fileName="liabilities.csv"
            />
          </>
        }
      />
      <Table initialData={results} isLoading={isLoading} className={classes.table}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};
