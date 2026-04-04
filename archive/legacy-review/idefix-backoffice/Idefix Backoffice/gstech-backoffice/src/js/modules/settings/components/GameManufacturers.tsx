import React, { ChangeEvent, useCallback } from "react";
import { GameManufacturer } from "app/types";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import useSearch from "../../../core/hooks/useSearch";

const columns = [
  { label: "ID", name: "id", align: "left", type: "text" },
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Active", name: "active", align: "left", type: "boolean" },
  { label: "Licence", name: "license", align: "left", type: "boolean" },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<GameManufacturer>(columns);

interface Props {
  items: GameManufacturer[];
  isLoading: boolean;
  onEditGameManufacturer: (gameManufacturerId: string) => void;
}

export default ({ items, isLoading, onEditGameManufacturer }: Props) => {
  const { query, setQuery, results } = useSearch<GameManufacturer>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Game Manufacturers</Typography>
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
            fileName="game_manufacturers.csv"
          />
        }
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
          format={(value: string, gameManufacturer: GameManufacturer) => (
            <Button color="primary" onClick={() => onEditGameManufacturer(gameManufacturer.id)}>
              Edit
            </Button>
          )}
          style={{ maxWidth: 98 }}
        />
      </Table>
    </Box>
  );
};
