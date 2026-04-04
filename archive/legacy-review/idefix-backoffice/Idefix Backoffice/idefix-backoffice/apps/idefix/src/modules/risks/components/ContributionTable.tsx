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
import { RiskStatus } from "@idefix-backoffice/idefix/types";
import { formatDate } from "@idefix-backoffice/idefix/utils";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "Type", name: "name", align: "left", type: "text" },
  { label: "Count", name: "count", align: "left", type: "text" },
  { label: "Last Occurrence", name: "latestOccurrence", align: "left", type: "date" },
  {
    label: "Contribution",
    name: "contribution",
    align: "right",
    type: "custom",
    format: (value: string) => `${value}%`
  }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<RiskStatus>(columns);

const keysToFormat = [{ key: "latestOccurrence", format: formatDate }];

interface Props {
  risksByType: RiskStatus[];
  isLoading: boolean;
}

const ContributionTable: FC<Props> = ({ risksByType, isLoading }) => {
  const { query, setQuery, results } = useSearch<RiskStatus>(searchBy, risksByType);
  const isEmpty = risksByType.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  return (
    <Box>
      <Typography variant="subtitle2">Risk Factor Contributions</Typography>
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
      </Table>
    </Box>
  );
};

export { ContributionTable };
