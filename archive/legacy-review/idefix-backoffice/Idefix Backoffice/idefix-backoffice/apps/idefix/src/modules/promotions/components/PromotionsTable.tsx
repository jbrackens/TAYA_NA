import React, { ChangeEvent, FC, useCallback } from "react";
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
import { PlayerPromotion } from "@idefix-backoffice/idefix/types";
import { formatDate } from "@idefix-backoffice/idefix/utils";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "Promotion", name: "promotion", align: "left", type: "text" },
  { label: "Status", name: "active", align: "left", type: "custom", format: value => (value ? "Active" : "Inactive") },
  { label: "Activated", name: "activated", align: "left", type: "date" },
  { label: "Wagered", name: "wagered", align: "left", type: "text" },
  { label: "Points", name: "points", align: "right", type: "text" }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PlayerPromotion>(columns);

const keysToFormat = [{ key: "activated", format: formatDate }];

interface Props {
  items: PlayerPromotion[];
  isLoading: boolean;
}

const PromotionsTable: FC<Props> = ({ items, isLoading }) => {
  const { query, setQuery, results } = useSearch<PlayerPromotion>(searchBy, items);
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
        placeholder="Search by Promotion, Activated, Wagered, Points"
        disabled={isEmpty}
        buttons={
          <DownloadCsvButton
            headers={CSV_HEADERS}
            data={results}
            disabled={isEmpty}
            keysToFormat={keysToFormat}
            fileName="promotions.csv"
          />
        }
      />

      <Table initialData={results} isLoading={isLoading}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};

export { PromotionsTable };
