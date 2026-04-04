import React, { ChangeEvent, useCallback } from "react";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import { createStyles, makeStyles } from "@material-ui/core/styles";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import useSearch from "../../../core/hooks/useSearch";
import { formatMoneyFromCents } from "../../../core/helpers/formatMoneyFromCents";

const useStyles = makeStyles(theme =>
  createStyles({
    table: {
      minWidth: 1528,
    },
  }),
);

const columns = [
  { label: "Username", name: "username", align: "left", type: "text", style: { minWidth: 208 } },
  { label: "First Name", name: "firstName", align: "left", type: "text", style: { minWidth: 198 } },
  { label: "Last Name", name: "lastName", align: "left", type: "text", style: { minWidth: 198 } },
  { label: "Country", name: "countryId", align: "left", type: "text", style: { minWidth: 82 } },
  { label: "E-mail", name: "email", align: "left", type: "text", style: { minWidth: 242 } },
  { label: "Risk Profile", name: "riskProfile", align: "left", type: "text", style: { minWidth: 82 } },
  { label: "Type", name: "paymentType", align: "left", type: "text", style: { minWidth: 118 } },
  { label: "Payment Method", name: "name", align: "left", type: "text", style: { minWidth: 158 } },
  {
    label: "Amount",
    name: "amount",
    align: "left",
    type: "custom",
    format: formatMoneyFromCents,
    style: { minWidth: 98 },
  },
  { label: "Transaction Count", name: "count", align: "right", type: "text", style: { minWidth: 118 } },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [{ key: "amount", format: formatMoneyFromCents }];

export default ({ items, isLoading }: { items: any[]; isLoading: boolean }) => {
  const classes = useStyles();
  const { query, setQuery, results } = useSearch<any>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Risk Transaction</Typography>
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
            fileName="risk_transaction.csv"
          />
        }
      />
      <Table initialData={results} isLoading={isLoading} displayRows={12} className={classes.table}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </Box>
  );
};
