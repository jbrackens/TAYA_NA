import React, { ChangeEvent, FC, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import { CountrySettings } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "Country code", name: "id", align: "left", type: "text", style: { minWidth: 148 } },
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Minimum age", name: "minimumAge", align: "left", type: "text" },
  { label: "Registrations", name: "registrationAllowed", align: "left", type: "boolean" },
  { label: "Blocked", name: "blocked", align: "left", type: "boolean" },
  { label: "Logins", name: "loginAllowed", align: "left", type: "boolean" }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<CountrySettings>(columns);

interface Props {
  items: CountrySettings[];
  isLoading: boolean;
  onEditCountry: (country: CountrySettings) => void;
}

const CountriesTable: FC<Props> = ({ items, isLoading, onEditCountry }) => {
  const { query, setQuery, results } = useSearch<CountrySettings>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  return (
    <Box>
      <Typography variant="subtitle2">Countries</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={<DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="countries.csv" />}
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
          format={(value: string, country: CountrySettings) => (
            <Button color="primary" onClick={() => onEditCountry(country)}>
              Edit
            </Button>
          )}
          style={{ maxWidth: 98 }}
        />
      </Table>
    </Box>
  );
};

export { CountriesTable };
