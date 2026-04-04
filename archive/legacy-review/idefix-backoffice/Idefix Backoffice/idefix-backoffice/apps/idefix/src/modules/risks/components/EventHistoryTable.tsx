import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import React, { ChangeEvent, FC, useCallback } from "react";
import { Link } from "react-router-dom";

import {
  Column,
  ColumnProps,
  DownloadCsvButton,
  getCsvHeaders,
  getSearchByKeys,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { RiskLog } from "@idefix-backoffice/idefix/types";
import { formatDate } from "@idefix-backoffice/idefix/utils";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "Triggered At", name: "createdAt", align: "left", type: "date" },
  { label: "Description", name: "name", align: "left", type: "text" },
  { label: "Risk points", name: "points", align: "left", type: "text" },
  { label: "Checked", name: "checked", align: "left", type: "text" },
  { label: "Handle", name: "handle", align: "left", type: "text" }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<RiskLog>(columns);

const keysToFormat = [{ key: "createdAt", format: formatDate }];

interface Props {
  playerId: number;
  logs: RiskLog[];
  isLoading: boolean;
}

const EventHistoryTable: FC<Props> = ({ playerId, logs, isLoading }) => {
  const { query, setQuery, results } = useSearch<RiskLog>(searchBy, logs);
  const isEmpty = logs.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  return (
    <Box>
      <Typography variant="subtitle2">Risk Event History</Typography>
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
            fileName="risk_factor_contributions.csv"
          />
        }
      />
      <Table initialData={results} isLoading={isLoading}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
        <Column
          label="Actions"
          name="actions"
          align="right"
          type="custom"
          format={(_: unknown, { id }: { id: number }) => (
            <Button component={Link} to={`/players/@${playerId}/tasks/fraud/${id}`}>
              Open
            </Button>
          )}
        />
      </Table>
    </Box>
  );
};

export { EventHistoryTable };
