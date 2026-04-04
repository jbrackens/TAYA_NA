import React, { ChangeEvent, FC, useCallback } from "react";
import { WithdrawalEvent } from "app/types";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";

const columns = [
  {
    label: "Timestamp",
    name: "timestamp",
    align: "left",
    type: "date",
  },
  {
    label: "Status",
    name: "status",
    align: "left",
    type: "text",
  },
  {
    label: "User",
    name: "handle",
    align: "left",
    type: "text",
  },
  {
    label: "Message",
    name: "message",
    align: "right",
    type: "text",
  },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<WithdrawalEvent>(columns);

interface Props {
  events: WithdrawalEvent[];
  isLoading: boolean;
}

const EventsTable: FC<Props> = ({ events, isLoading }) => {
  const { query, setQuery, results } = useSearch<WithdrawalEvent>(searchBy, events);
  const isEmpty = events.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Events</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={<DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="events.csv" />}
      />
      <Table initialData={results} isLoading={isLoading}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};

export { EventsTable };
