import React, { ChangeEvent, useCallback } from "react";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { Risk } from "app/types";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";

const columns = [
  {
    label: "Name",
    name: "name",
    align: "left",
    type: "text",
    style: {
      paddingRight: 8,
      minWidth: 232,
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    },
  },
  { label: "Fraud Key", name: "fraudKey", align: "left", type: "text", style: { maxWidth: 208 } },
  { label: "Type", name: "type", align: "left", type: "text", style: { maxWidth: 124 } },
  { label: "Points", name: "points", align: "left", type: "text", style: { maxWidth: 64 } },
  { label: "Max", name: "maxCumulativePoints", align: "left", type: "text", style: { maxWidth: 64 } },
  { label: "Required Role", name: "requiredRole", align: "left", type: "text", style: { maxWidth: 124 } },
  { label: "Active", name: "active", align: "left", type: "boolean", style: { maxWidth: 48 } },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<Risk>(columns);

interface Props {
  items: Risk[];
  isLoading: boolean;
  onEditRisk: (risk: Risk) => void;
}

export default ({ items, isLoading, onEditRisk }: Props) => {
  const { query, setQuery, results } = useSearch<Risk>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Risks</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={<DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="risks.csv" />}
      />
      <Table initialData={results} isLoading={isLoading} displayRows={12}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
        <Column
          label="Actions"
          name="actions"
          align="right"
          type="custom"
          format={(value: unknown, risk: Risk) => (
            <Button color="primary" onClick={() => onEditRisk(risk)}>
              Edit
            </Button>
          )}
          style={{ maxWidth: 98 }}
        />
      </Table>
    </Box>
  );
};
