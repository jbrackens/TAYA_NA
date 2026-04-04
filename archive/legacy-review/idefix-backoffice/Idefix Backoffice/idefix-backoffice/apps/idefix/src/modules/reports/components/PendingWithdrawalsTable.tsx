import React, { ChangeEvent, FC, useCallback } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import {
  Column,
  ColumnProps,
  createColumnsToCsv,
  DownloadCsvButton,
  getSearchByKeys,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { formatDate, formatMoneyFromCents } from "@idefix-backoffice/idefix/utils";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "Method", name: "method", align: "left", type: "text", style: { minWidth: 154 } },
  { label: "Amount", name: "amount", align: "left", type: "text", style: { minWidth: 154 } },
  { label: "Currency", name: "currencyId", align: "left", type: "text", style: { minWidth: 82 } },
  {
    label: "Requested",
    name: "timestamp",
    align: "left",
    type: "date"
  },
  { label: "Status", name: "status", align: "left", type: "text", style: { minWidth: 82 } },
  { label: "Account", name: "account", align: "left", type: "text", style: { minWidth: 118 } },
  { label: "Player name", name: "name", align: "left", type: "text", style: { minWidth: 154 } },
  { label: "Username", name: "username", align: "left", type: "text", style: { minWidth: 154 } },
  { label: "Country", name: "countryId", align: "right", type: "text", style: { minWidth: 118 } }
] as ColumnProps[];

const CSV_HEADERS = createColumnsToCsv(columns, ["amount"], [{ label: "Amount", name: "rawAmount" }]);
const searchBy = getSearchByKeys<any>(columns);

const keysToFormat = [
  { key: "timestamp", format: formatDate },
  { key: "rawAmount", format: formatMoneyFromCents }
];

interface Props {
  items: any[];
  isLoading: boolean;
}

const PendingWithdrawalsTable: FC<Props> = ({ items, isLoading }) => {
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
      <Typography variant="subtitle2">Pending Withdrawals</Typography>
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
            fileName="pending_withdrawals.csv"
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

export { PendingWithdrawalsTable };
