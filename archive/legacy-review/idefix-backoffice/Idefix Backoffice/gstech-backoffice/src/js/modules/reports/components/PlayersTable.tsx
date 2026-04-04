import React, { ChangeEvent, useCallback } from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import { formatDate } from "../../../core/helpers/formatDate";

const columns = [
  { label: "First name", name: "firstName", align: "left", type: "text", style: { minWidth: 238 } },
  { label: "Last name", name: "lastName", align: "left", type: "text", style: { minWidth: 238 } },
  { label: "E-mail", name: "email", align: "left", type: "text", style: { minWidth: 238 } },
  { label: "Phone", name: "mobilePhone", align: "left", type: "text" },
  {
    label: "Last seen",
    name: "lastLogin",
    align: "right",
    type: "date",
  },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [{ key: "lastLogin", format: formatDate }];

export default ({ items, isLoading }: { items: any[]; isLoading: boolean }) => {
  const { query, setQuery, results } = useSearch<any>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Dormant Players</Typography>
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
            keysToFormat={keysToFormat}
            fileName="dormant_players.csv"
          />
        }
      />
      <Table initialData={results} isLoading={isLoading} displayRows={12}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};
