import React, { ChangeEvent, useCallback } from "react";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { PaymentProvider } from "app/types";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import useSearch from "../../../core/hooks/useSearch";

const columns = [
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Active", name: "active", align: "left", type: "boolean" },
  { label: "Deposits", name: "deposits", align: "left", type: "boolean" },
  { label: "Withdrawals", name: "withdrawals", align: "left", type: "boolean" },
  { label: "Priority", name: "priority", align: "left", type: "text" },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PaymentProviderItem>(columns);

type PaymentProviderItem = Omit<PaymentProvider, "currencies" | "countries">;

interface Props {
  items: PaymentProviderItem[];
  onOpenDetails: (paymentProvider: PaymentProvider) => void;
}

export default ({ items, onOpenDetails }: Props) => {
  const { query, setQuery, results } = useSearch<PaymentProviderItem>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
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
