import React, { ChangeEvent, useCallback } from "react";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { GameProfile } from "app/types";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import useSearch from "../../../core/hooks/useSearch";

const columns = [
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Wagering Multiplier", name: "wageringMultiplier", align: "left", type: "boolean" },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<GameProfile>(columns);

interface Props {
  items: GameProfile[];
  isLoading: boolean;
  onEditGameProfile: (setting: any, settingNameKey: string, dialogName: string) => void;
}

export default ({ items, isLoading, onEditGameProfile }: Props) => {
  const { query, setQuery, results } = useSearch<GameProfile>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
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
