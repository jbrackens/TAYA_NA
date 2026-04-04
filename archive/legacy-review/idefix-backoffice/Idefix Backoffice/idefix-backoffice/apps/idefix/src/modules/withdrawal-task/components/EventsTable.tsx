import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React, { ChangeEvent, FC, useCallback } from "react";

import {
  Column,
  ColumnProps,
  DownloadCsvButton,
  getCsvHeaders,
  getSearchByKeys,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { WithdrawalEvent } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  {
    label: "Timestamp",
    name: "timestamp",
    align: "left",
    type: "date"
  },
  {
    label: "Status",
    name: "status",
    align: "left",
    type: "text"
  },
  {
    label: "User",
    name: "handle",
    align: "left",
    type: "text"
  },
  {
    label: "Message",
    name: "message",
    align: "right",
    type: "text"
  }
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
    [setQuery]
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
