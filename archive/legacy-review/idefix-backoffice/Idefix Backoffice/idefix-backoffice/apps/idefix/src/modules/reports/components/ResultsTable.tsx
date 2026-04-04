import React, { ChangeEvent, FC, useCallback } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import {
  ColumnProps,
  createColumnsToCsv,
  getSearchByKeys,
  DownloadCsvButton,
  Column,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { formatMoneyFromCents } from "@idefix-backoffice/idefix/utils";
import { useSearch } from "@idefix-backoffice/shared/hooks";
import { format } from "../helpers";

const columns = [
  { label: "Title", name: "title", align: "left", type: "custom", format },
  { label: "Bets", name: "bets", align: "left", type: "custom", format },
  { label: "Wins", name: "wins", align: "left", type: "custom", format },
  {
    label: "Jackpots",
    name: "jackpots",
    align: "left",
    type: "custom",
    format
  },
  {
    label: "Gross win",
    name: "grossWin",
    align: "left",
    type: "custom",
    format
  },
  { label: "RTP %", name: "RTP", align: "left", type: "custom", format },
  {
    label: "Bonus to real",
    name: "turnedReal",
    align: "left",
    type: "custom",
    format
  },
  {
    label: "Compensations",
    name: "compensations",
    align: "left",
    type: "custom",
    format
  },
  { label: "Net result", name: "total", align: "right", type: "custom", format }
] as ColumnProps[];

const CSV_HEADERS = createColumnsToCsv(
  columns,
  ["bets", "wins", "jackpots", "grossWin", "turnedReal", "totalBets", "totalWins"],
  [
    { label: "Bets", name: "rawBets" },
    { label: "Wins", name: "rawWins" },
    { label: "Bonus Bets", name: "rawJackpots" },
    { label: "Bonus Wins", name: "rawGrossWin" },
    { label: "Jackpots", name: "rawTurnedReal" },
    { label: "Total Bets", name: "rawCompensations" },
    { label: "Total Wins", name: "rawTotal" }
  ]
);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [
  { key: "rawBets", format: formatMoneyFromCents },
  { key: "rawWins", format: formatMoneyFromCents },
  { key: "rawJackpots", format: formatMoneyFromCents },
  { key: "rawGrossWin", format: formatMoneyFromCents },
  { key: "rawTurnedReal", format: formatMoneyFromCents },
  { key: "rawCompensations", format: formatMoneyFromCents },
  { key: "rawTotal", format: formatMoneyFromCents }
];

interface Props {
  items: any[];
  isLoading: boolean;
}

const ResultsTable: FC<Props> = ({ items, isLoading }) => {
  const { query, setQuery, results } = useSearch<any>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  return (
    <Box>
      <Typography variant="subtitle2">Results</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={
          <DownloadCsvButton
            headers={CSV_HEADERS}
            data={results}
            disabled={isEmpty}
            keysToFormat={keysToFormat}
            fileName="results.csv"
          />
        }
      />
      <Table initialData={results} isLoading={isLoading} displayRows={12}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};

export { ResultsTable };
