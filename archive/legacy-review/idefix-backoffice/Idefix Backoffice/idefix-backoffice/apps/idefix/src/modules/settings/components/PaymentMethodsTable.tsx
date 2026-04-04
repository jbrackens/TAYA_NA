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
import { PaymentMethod } from "@idefix-backoffice/idefix/types";
import { useSearch } from "@idefix-backoffice/shared/hooks";

const columns = [
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 182 } },
  { label: "Active", name: "active", align: "left", type: "boolean" },
  { label: "Allow auto verification", name: "allowAutoVerification", align: "left", type: "boolean" },
  { label: "High risk", name: "highRisk", align: "left", type: "boolean" },
  { label: "Require verification", name: "requireVerification", align: "left", type: "boolean" }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PaymentMethod>(columns);

interface Props {
  items: PaymentMethod[];
  isLoading: boolean;
  onEditPaymentMethod: ({ id }: { id: number }) => void;
}

const PaymentMethodsTable: FC<Props> = ({ items, isLoading, onEditPaymentMethod }) => {
  const { query, setQuery, results } = useSearch<PaymentMethod>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
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

export { PaymentMethodsTable };
