import React, { ChangeEvent, useCallback } from "react";
import { PlayerPromotion } from "app/types";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import { formatDate } from "../../../core/helpers/formatDate";

const columns = [
  { label: "Promotion", name: "promotion", align: "left", type: "text" },
  { label: "Status", name: "active", align: "left", type: "custom", format: value => (value ? "Active" : "Inactive") },
  { label: "Activated", name: "activated", align: "left", type: "date" },
  { label: "Wagered", name: "wagered", align: "left", type: "text" },
  { label: "Points", name: "points", align: "right", type: "text" },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PlayerPromotion>(columns);

const keysToFormat = [{ key: "activated", format: formatDate }];

export default ({ items, isLoading }: { items: PlayerPromotion[]; isLoading: boolean }) => {
  const { query, setQuery, results } = useSearch<PlayerPromotion>(searchBy, items);
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
