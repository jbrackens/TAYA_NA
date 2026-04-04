import React, { ChangeEvent, FC, useCallback } from "react";
import Button from "@mui/material/Button";
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
import { Risk } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";

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
      textOverflow: "ellipsis"
    }
  },
  { label: "Fraud Key", name: "fraudKey", align: "left", type: "text", style: { maxWidth: 208 } },
  { label: "Type", name: "type", align: "left", type: "text", style: { maxWidth: 124 } },
  { label: "Points", name: "points", align: "left", type: "text", style: { maxWidth: 64 } },
  { label: "Max", name: "maxCumulativePoints", align: "left", type: "text", style: { maxWidth: 64 } },
  { label: "Required Role", name: "requiredRole", align: "left", type: "text", style: { maxWidth: 124 } },
  { label: "Active", name: "active", align: "left", type: "boolean", style: { maxWidth: 48 } }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<Risk>(columns);

interface Props {
  items: Risk[];
  isLoading: boolean;
  onEditRisk: (risk: Risk) => void;
}

const RisksTable: FC<Props> = ({ items, isLoading, onEditRisk }) => {
  const { query, setQuery, results } = useSearch<Risk>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
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

export { RisksTable };
