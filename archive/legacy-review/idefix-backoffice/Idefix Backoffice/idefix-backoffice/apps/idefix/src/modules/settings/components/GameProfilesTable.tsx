import React, { ChangeEvent, FC, useCallback } from "react";
import Button from "@mui/material/Button";
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
import { GameProfile } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Wagering Multiplier", name: "wageringMultiplier", align: "left", type: "boolean" }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<GameProfile>(columns);

interface Props {
  items: GameProfile[];
  isLoading: boolean;
  onEditGameProfile: (setting: any, settingNameKey: string, dialogName: string) => void;
}

const GameProfilesTable: FC<Props> = ({ items, isLoading, onEditGameProfile }) => {
  const { query, setQuery, results } = useSearch<GameProfile>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  return (
    <Box>
      <Typography variant="subtitle2">Game Profiles</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={
          <DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="game_profiles.csv" />
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
          format={(value: unknown, gameProfile: GameProfile) => (
            <Button color="primary" onClick={() => onEditGameProfile(gameProfile, "gameProfile", "edit-game-profile")}>
              Edit
            </Button>
          )}
          style={{ maxWidth: 98 }}
        />
      </Table>
    </Box>
  );
};

export { GameProfilesTable };
