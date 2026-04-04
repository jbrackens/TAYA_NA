import React, { ChangeEvent, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import { RiskLog } from "app/types";
import Typography from "@material-ui/core/Typography";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import useSearch from "../../../core/hooks/useSearch";
import { formatDate } from "../../../core/helpers/formatDate";

const columns = [
  { label: "Triggered At", name: "createdAt", align: "left", type: "date" },
  { label: "Description", name: "name", align: "left", type: "text" },
  { label: "Risk points", name: "points", align: "left", type: "text" },
  { label: "Checked", name: "checked", align: "left", type: "text" },
  { label: "Handle", name: "handle", align: "left", type: "text" },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<RiskLog>(columns);

const keysToFormat = [{ key: "createdAt", format: formatDate }];

export default ({ logs, isLoading }: { logs: RiskLog[]; isLoading: boolean }) => {
  const params = useParams();
  const playerId = Number(params.playerId);
  const { query, setQuery, results } = useSearch<RiskLog>(searchBy, logs);
  const isEmpty = logs.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
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
