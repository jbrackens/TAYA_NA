import React, { ChangeEvent, useCallback } from "react";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import { GameSettings } from "app/types";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";

const columns = [
  { label: "Permalink", name: "permalink", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "ID", name: "gameId", align: "left", type: "text", style: { minWidth: 264 } },
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Manufacturer", name: "manufacturerName", align: "left", type: "text", style: { minWidth: 182 } },
  {
    label: "Manufacturer ID",
    name: "manufacturerGameId",
    align: "left",
    type: "text",
    style: { minWidth: 182, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  },
  { label: "RTP%", name: "rtp", align: "left", type: "text" },
  { label: "Mobile", name: "mobileGame", align: "left", type: "boolean" },
  { label: "Play for fun", name: "playForFun", align: "left", type: "boolean" },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<GameSettings>(columns);

interface Props {
  items: GameSettings[];
  isLoading: boolean;
  onEditGame: (game: GameSettings) => void;
}

export default ({ items, isLoading, onEditGame }: Props) => {
  const { query, setQuery, results } = useSearch<GameSettings>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Games</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={<DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="games.csv" />}
      />
      <Table initialData={results} isLoading={isLoading} displayRows={12}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
        <Column
          label="Actions"
          name="actions"
          align="right"
          type="custom"
          format={(value: string, game: GameSettings) => (
            <Button color="primary" onClick={() => onEditGame(game)}>
              Edit
            </Button>
          )}
          style={{ maxWidth: 98 }}
        />
      </Table>
    </Box>
  );
};
