import React, { ChangeEvent, useCallback } from "react";
import { UserLog } from "app/types";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";

import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import useSearch from "../../../core/hooks/useSearch";
import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import { formatDate } from "../../../core/helpers/formatDate";

const columns = [
  {
    label: "Time",
    name: "time",
    align: "left",
    type: "date",
  },
  { label: "Event", name: "event", align: "left", type: "text", style: { minWidth: 300 } },
  { label: "IP", name: "ip", align: "left", type: "text" },
  { label: "Created By", name: "createdBy", align: "right", type: "text" },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<UserLog>(columns);

const keysToFormat = [
  {
    key: "time",
    format: formatDate,
  },
];

interface Props {
  log: UserLog[];
  isFetchingLog: boolean;
}

export default ({ log, isFetchingLog }: Props) => {
  const { query, setQuery, results } = useSearch<UserLog>(searchBy, log);
  const isEmpty = log.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">User Log</Typography>
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
            fileName="user_log.csv"
          />
        }
      />
      <Table initialData={results} isLoading={isFetchingLog} displayRows={6}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};
