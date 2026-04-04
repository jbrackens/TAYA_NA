import React, { ChangeEvent, FC, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { formatMoneyFromCents } from "@idefix-backoffice/idefix/utils";
import {
  Column,
  ColumnProps,
  DownloadCsvButton,
  getCsvHeaders,
  getSearchByKeys,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { Promotion } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";
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
    format: formatMoneyFromCents
  }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<Promotion>(columns);

interface Props {
  items: Promotion[];
  isLoading: boolean;
  onEditPromotion: (setting: any, settingNameKey: string, dialogName: string) => void;
  onArchive: (id: number, settingsType: string) => void;
}

const PromotionsTable: FC<Props> = ({ items, isLoading, onEditPromotion, onArchive }) => {
  const filteredItems = items.filter(item => !item.archived);
  const { query, setQuery, results } = useSearch<Promotion>(searchBy, filteredItems);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
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

export { PromotionsTable };
