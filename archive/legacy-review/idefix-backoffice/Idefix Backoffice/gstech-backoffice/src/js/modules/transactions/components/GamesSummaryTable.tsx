import React, { ChangeEvent, useCallback } from "react";
import { GamesSummary } from "app/types";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import { DownloadCsvButton } from "../../../core/components/button";
import Search from "../../../core/components/search";
import useSearch from "../../../core/hooks/useSearch";

const columns = [
  { label: "Manufacturer", name: "manufacturer", align: "left", type: "text" },
  { label: "Game", name: "name", align: "left", type: "text" },
  { label: "Real bets", name: "realBets", align: "left", type: "text" },
  { label: "Real wins", name: "realWins", align: "left", type: "text" },
  { label: "Bonus bets", name: "bonusBets", align: "left", type: "text" },
  { label: "Bonus wins", name: "bonusWins", align: "left", type: "text" },
  { label: "Average bet", name: "averageBet", align: "left", type: "text" },
  { label: "Bet count", name: "betCount", align: "left", type: "text" },
  { label: "Biggest win", name: "biggestWin", align: "right", type: "text" },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<GamesSummary>(columns);

export default ({ games, isLoading }: { games: GamesSummary[]; isLoading: boolean }) => {
  const { query, setQuery, results } = useSearch<GamesSummary>(searchBy, games);
  const isEmpty = games.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Summary</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={<DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="summary.csv" />}
      />
      <Table initialData={results} isLoading={isLoading} displayRows={12}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};
