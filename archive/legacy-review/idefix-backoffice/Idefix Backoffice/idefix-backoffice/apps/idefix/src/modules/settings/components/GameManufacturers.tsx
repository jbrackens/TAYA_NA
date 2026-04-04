import React, { ChangeEvent, FC, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import { GameManufacturer } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "ID", name: "id", align: "left", type: "text" },
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Active", name: "active", align: "left", type: "boolean" },
  { label: "Licence", name: "license", align: "left", type: "boolean" }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<GameManufacturer>(columns);

interface Props {
  items: GameManufacturer[];
  isLoading: boolean;
  onEditGameManufacturer: (gameManufacturerId: string) => void;
}

const GameManufacturersTable: FC<Props> = ({ items, isLoading, onEditGameManufacturer }) => {
  const { query, setQuery, results } = useSearch<GameManufacturer>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
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

export { GameManufacturersTable };
