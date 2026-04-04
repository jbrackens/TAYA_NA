import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ChangeEvent, FC, useCallback } from "react";

import {
  Column,
  ColumnProps,
  DownloadCsvButton,
  getCsvHeaders,
  getSearchByKeys,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { UserLog } from "@idefix-backoffice/idefix/types";
import { formatDate } from "@idefix-backoffice/idefix/utils";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  {
    label: "Time",
    name: "time",
    align: "left",
    type: "date"
  },
  { label: "Event", name: "event", align: "left", type: "text", style: { minWidth: 300 } },
  { label: "IP", name: "ip", align: "left", type: "text" },
  { label: "Created By", name: "createdBy", align: "right", type: "text" }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<UserLog>(columns);

const keysToFormat = [
  {
    key: "time",
    format: formatDate
  }
];

interface Props {
  isLoading: boolean;
  log: UserLog[];
}

const UserLogs: FC<Props> = ({ isLoading, log }) => {
  const { query, setQuery, results } = useSearch<UserLog>(searchBy, log);
  const isEmpty = log.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
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
      <Table initialData={results} isLoading={isLoading} displayRows={6}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};

export { UserLogs };
