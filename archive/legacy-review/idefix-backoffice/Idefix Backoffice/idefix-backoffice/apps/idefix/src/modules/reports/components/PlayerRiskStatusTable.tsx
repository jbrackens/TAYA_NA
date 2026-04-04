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
import { formatDate } from "@idefix-backoffice/idefix/utils";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "Username", name: "username", align: "left", type: "text", style: { minWidth: 238 } },
  { label: "First Name", name: "firstName", align: "left", type: "text", style: { minWidth: 238 } },
  { label: "Last Name", name: "lastName", align: "left", type: "text", style: { minWidth: 238 } },
  { label: "Country", name: "countryId", align: "left", type: "text", style: { minWidth: 82 } },
  { label: "E-mail", name: "email", align: "left", type: "text", style: { minWidth: 238 } },
  { label: "Risk Profile", name: "riskProfile", align: "left", type: "text", style: { minWidth: 82 } },
  {
    label: "Flagged",
    name: "flagged",
    align: "left",
    type: "boolean"
  },
  {
    label: "Locked",
    name: "locked",
    align: "left",
    type: "boolean"
  },
  {
    label: "Lock time",
    name: "lockTime",
    align: "right",
    type: "date"
  }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [{ key: "lockTime", format: formatDate }];

interface Props {
  items: any[];
  isLoading: boolean;
}

const PlayerRiskStatusTable: FC<Props> = ({ items, isLoading }) => {
  const { query, setQuery, results } = useSearch<any>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );
  return (
    <Box>
      <Typography variant="subtitle2">Player Risk Status</Typography>
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
            fileName="player_risk_status.csv"
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

export { PlayerRiskStatusTable };
