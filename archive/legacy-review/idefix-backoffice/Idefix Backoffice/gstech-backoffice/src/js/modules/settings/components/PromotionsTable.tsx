import React, { ChangeEvent, useCallback } from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { Promotion } from "app/types";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import { formatMoneyFromCents } from "../../../core/helpers/formatMoneyFromCents";
import { MenuButton } from "./MenuButton";

const columns = [
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 212 } },
  { label: "Multiplier", name: "multiplier", align: "left", type: "text" },
  { label: "AutoStart", name: "autoStart", align: "left", type: "boolean" },
  { label: "Active", name: "active", align: "left", type: "boolean" },
  { label: "All games", name: "allGames", align: "left", type: "boolean" },
  { label: "Calculate rounds", name: "calculateRounds", align: "left", type: "boolean" },
  { label: "Calculate wins", name: "calculateWins", align: "left", type: "boolean" },
  { label: "Calculate wins ratio", name: "calculateWinsRatio", align: "left", type: "boolean" },
  {
    label: "Minimum contribution",
    name: "minimumContribution",
    align: "left",
    type: "custom",
    format: formatMoneyFromCents,
  },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<Promotion>(columns);

interface Props {
  items: Promotion[];
  isLoading: boolean;
  onEditPromotion: (setting: any, settingNameKey: string, dialogName: string) => void;
  onArchive: (id: number, settingsType: string) => void;
}

export default ({ items, isLoading, onEditPromotion, onArchive }: Props) => {
  const filteredItems = items.filter(item => !item.archived);
  const { query, setQuery, results } = useSearch<Promotion>(searchBy, filteredItems);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Promotions</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={
          <DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="promotions.csv" />
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
          format={(value: unknown, promotion: Promotion) => (
            <MenuButton row={promotion} onEditPromotion={onEditPromotion} onArchive={onArchive} />
          )}
          style={{ maxWidth: 98 }}
        />
      </Table>
    </Box>
  );
};
