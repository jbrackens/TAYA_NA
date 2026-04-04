import React, { ChangeEvent, useCallback } from "react";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { PaymentMethod } from "app/types";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";

const columns = [
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Active", name: "active", align: "left", type: "boolean" },
  { label: "Allow auto verification", name: "allowAutoVerification", align: "left", type: "boolean" },
  { label: "High risk", name: "highRisk", align: "left", type: "boolean" },
  { label: "Require verification", name: "requireVerification", align: "left", type: "boolean" },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PaymentMethod>(columns);

interface Props {
  items: PaymentMethod[];
  isLoading: boolean;
  onEditPaymentMethod: ({ id }: { id: number }) => void;
}

export default ({ items, isLoading, onEditPaymentMethod }: Props) => {
  const { query, setQuery, results } = useSearch<PaymentMethod>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Payment Methods</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={
          <DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="payment_methods.csv" />
        }
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
          format={(value: unknown, paymentMethod: PaymentMethod) => (
            <Button color="primary" onClick={() => onEditPaymentMethod(paymentMethod)}>
              Edit
            </Button>
          )}
          style={{ maxWidth: 98 }}
        />
      </Table>
    </Box>
  );
};
