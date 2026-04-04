import { ChangeEvent, FC, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import {
  Column,
  ColumnProps,
  DownloadCsvButton,
  getCsvHeaders,
  getSearchByKeys,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { GamesSummary } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "Manufacturer", name: "manufacturer", align: "left", type: "text" },
  { label: "Game", name: "name", align: "left", type: "text" },
  { label: "Real bets", name: "realBets", align: "left", type: "text" },
  { label: "Real wins", name: "realWins", align: "left", type: "text" },
  { label: "Bonus bets", name: "bonusBets", align: "left", type: "text" },
  { label: "Bonus wins", name: "bonusWins", align: "left", type: "text" },
  { label: "Average bet", name: "averageBet", align: "left", type: "text" },
  { label: "Bet count", name: "betCount", align: "left", type: "text" },
  { label: "Biggest win", name: "biggestWin", align: "right", type: "text" }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<GamesSummary>(columns);

interface Props {
  games: GamesSummary[];
  isLoading: boolean;
}

const GamesSummaryTable: FC<Props> = ({ games, isLoading }) => {
  const { query, setQuery, results } = useSearch<GamesSummary>(searchBy, games);
  const isEmpty = games.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
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

export { GamesSummaryTable };
