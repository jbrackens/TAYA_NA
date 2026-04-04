import React, { ChangeEvent, useCallback } from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";

import { format, formatWithMargin } from "../helpers";
import Table, { Column, ColumnProps, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import { createColumnsToCsv } from "../../../core/components/table/helpers";
import { formatMoneyFromCents } from "../../../core/helpers/formatMoneyFromCents";

const columns = [
  {
    label: "Title",
    name: "title",
    align: "left",
    type: "custom",
    format: formatWithMargin,
    style: { minWidth: 224 },
  },
  { label: "Manufacturer", name: "manufacturer", align: "left", type: "text", style: { minWidth: 164 } },
  { label: "Rounds", name: "rounds", align: "left", type: "custom", format },
  { label: "Bets", name: "bets", align: "left", type: "custom", format },
  { label: "Wins", name: "wins", align: "left", type: "custom", format },
  { label: "Bonus Bets", name: "bonusBets", align: "left", type: "custom", format },
  { label: "Bonus Wins", name: "bonusWins", align: "left", type: "custom", format },
  { label: "Jackpots", name: "jackpots", align: "left", type: "custom", format },
  { label: "Total Bets", name: "totalBets", align: "left", type: "custom", format },
  { label: "Total Wins", name: "totalWins", align: "left", type: "custom", format },
  { label: "Payout %", name: "payout", align: "right", type: "custom", format, style: { minWidth: 64 } },
] as ColumnProps[];

const CSV_HEADERS = createColumnsToCsv(
  columns,
  ["bets", "wins", "bonusBets", "bonusWins", "jackpots", "totalBets", "totalWins"],
  [
    { label: "Bets", name: "rawBets" },
    { label: "Wins", name: "rawWins" },
    { label: "Bonus Bets", name: "rawBonusBets" },
    { label: "Bonus Wins", name: "rawBonusWins" },
    { label: "Jackpots", name: "rawJackpots" },
    { label: "Total Bets", name: "rawTotalBets" },
    { label: "Total Wins", name: "rawTotalWins" },
  ],
);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [
  { key: "rawBets", format: formatMoneyFromCents },
  { key: "rawWins", format: formatMoneyFromCents },
  { key: "rawBonusBets", format: formatMoneyFromCents },
  { key: "rawBonusWins", format: formatMoneyFromCents },
  { key: "rawJackpots", format: formatMoneyFromCents },
  { key: "rawTotalBets", format: formatMoneyFromCents },
  { key: "rawTotalWins", format: formatMoneyFromCents },
];

export default ({ items, isLoading }: { items: any[]; isLoading: boolean }) => {
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
      <Typography variant="subtitle2">Game Turnover</Typography>
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
            fileName="game_turnover.csv"
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
