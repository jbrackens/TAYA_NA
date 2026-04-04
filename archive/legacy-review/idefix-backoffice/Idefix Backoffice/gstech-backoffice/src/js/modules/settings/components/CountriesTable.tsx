import React, { ChangeEvent, useCallback } from "react";
import { CountrySettings } from "app/types";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";

const columns = [
  { label: "Country code", name: "id", align: "left", type: "text", style: { minWidth: 148 } },
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Minimum age", name: "minimumAge", align: "left", type: "text" },
  { label: "Registrations", name: "registrationAllowed", align: "left", type: "boolean" },
  { label: "Blocked", name: "blocked", align: "left", type: "boolean" },
  { label: "Logins", name: "loginAllowed", align: "left", type: "boolean" },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<CountrySettings>(columns);

interface Props {
  items: CountrySettings[];
  isLoading: boolean;
  onEditCountry: (country: CountrySettings) => void;
}

export default ({ items, isLoading, onEditCountry }: Props) => {
  const { query, setQuery, results } = useSearch<CountrySettings>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
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
