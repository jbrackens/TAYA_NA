import React, { ChangeEvent, useCallback } from "react";
import { RiskStatus } from "app/types";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import useSearch from "../../../core/hooks/useSearch";
import { formatDate } from "../../../core/helpers/formatDate";

const columns = [
  { label: "Type", name: "name", align: "left", type: "text" },
  { label: "Count", name: "count", align: "left", type: "text" },
  { label: "Last Occurrence", name: "latestOccurrence", align: "left", type: "date" },
  {
    label: "Contribution",
    name: "contribution",
    align: "right",
    type: "custom",
    format: (value: string) => `${value}%`,
  },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<RiskStatus>(columns);

const keysToFormat = [{ key: "latestOccurrence", format: formatDate }];

export default ({ risksByType, isLoading }: { risksByType: RiskStatus[]; isLoading: boolean }) => {
  const { query, setQuery, results } = useSearch<RiskStatus>(searchBy, risksByType);
  const isEmpty = risksByType.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
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
