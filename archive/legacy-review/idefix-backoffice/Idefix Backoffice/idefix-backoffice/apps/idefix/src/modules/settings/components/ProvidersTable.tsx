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
import { PaymentProvider } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Active", name: "active", align: "left", type: "boolean" },
  { label: "Deposits", name: "deposits", align: "left", type: "boolean" },
  { label: "Withdrawals", name: "withdrawals", align: "left", type: "boolean" },
  { label: "Priority", name: "priority", align: "left", type: "text" }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PaymentProviderItem>(columns);

type PaymentProviderItem = Omit<PaymentProvider, "currencies" | "countries">;

interface Props {
  items: PaymentProviderItem[];
  onOpenDetails: (paymentProvider: PaymentProvider) => void;
}

const ProvidersTable: FC<Props> = ({ items, onOpenDetails }) => {
  const { query, setQuery, results } = useSearch<PaymentProviderItem>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  return (
    <Box>
      <Typography variant="subtitle2">Method Providers</Typography>
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
            fileName="payment_method_providers.csv"
          />
        }
      />
      <Table initialData={results} isLoading={false} displayRows={12}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
        <Column
          label="Actions"
          name="actions"
          align="right"
          type="custom"
          format={(value: unknown, provider: PaymentProvider) => (
            <Button color="primary" onClick={() => onOpenDetails(provider)}>
              Edit
            </Button>
          )}
          style={{ maxWidth: 98 }}
        />
      </Table>
    </Box>
  );
};

export { ProvidersTable };
