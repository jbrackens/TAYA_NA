import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { makeStyles } from "@mui/styles";
import { ChangeEvent, FC, useCallback, useState } from "react";
import debounce from "lodash/debounce";

import { PlayerPayment } from "@idefix-backoffice/idefix/types";
import { Column, DownloadAllCsvButton, DropdownFilter, Search, Table } from "@idefix-backoffice/idefix/components";

import { columns, CSV_HEADERS, fetchFormattedPaymentTransactions } from "../helpers";
import { ActionsButton } from "./ActionsButton";
import { InfoButton } from "./InfoButton";

const useStyles = makeStyles({
  table: {
    minWidth: 1540
  }
});

interface Props {
  playerId: number;
  transactions: PlayerPayment[];
  isLoading: boolean;
  paymentAccess: boolean;
  onCancel: (id: string) => void;
  onConfirm: (id: string) => void;
  onEditWagering: (payment: { counterId: number }) => void;
  onCompleteDepositTransaction: (transactionKey: string, transactionId: string) => void;
  onFetchPaymentsTransactions: (pageSize?: number, text?: string) => void;
  onFilterCheck: (filter: string, value: boolean, text?: string) => void;
  filtersList: string[];
  filters: {
    complete: boolean;
    pending: boolean;
    failed: boolean;
    cancelled: boolean;
    created: boolean;
  };
}

const PaymentTransactionsTable: FC<Props> = ({
  playerId,
  transactions,
  isLoading,
  onCancel,
  onConfirm,
  onEditWagering,
  onCompleteDepositTransaction,
  paymentAccess,
  onFetchPaymentsTransactions,
  onFilterCheck,
  filtersList,
  filters
}) => {
  const classes = useStyles();
  const [query, setQuery] = useState<string>("");
  const isEmpty = transactions.length === 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounced = useCallback(
    debounce(query => onFetchPaymentsTransactions(100, query), 500),
    []
  );

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const text = event.target.value;
      setQuery(text);
      debounced(text);
    },
    [debounced]
  );

  const handleLoadMoreDate = useCallback(
    (pageSize: number) => {
      if (!query) {
        onFetchPaymentsTransactions(pageSize, query);
      }
    },
    [onFetchPaymentsTransactions, query]
  );

  const handleFetchAllPaymentsTransactions = useCallback(async () => {
    return await fetchFormattedPaymentTransactions(playerId, {
      status: filters,
      pageSize: 0,
      text: query
    });
  }, [filters, playerId, query]);

  const handleCheck = useCallback(
    (query: string) => (filter: string) => (event: React.ChangeEvent<HTMLInputElement>, value?: boolean) => {
      onFilterCheck(filter, Boolean(value), query);
    },
    [onFilterCheck]
  );

  return (
    <Box>
      <Typography variant="subtitle2">Payment transactions</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={false}
        buttons={
          <Box display="flex">
            <DropdownFilter list={filtersList} filters={filters} onFilterChange={handleCheck(query)} />
            <DownloadAllCsvButton
              headers={CSV_HEADERS}
              onFetchData={handleFetchAllPaymentsTransactions}
              disabled={isEmpty || isLoading}
              fileName="payment_transactions.csv"
              tooltipText="Download all transactions"
            />
          </Box>
        }
      />
      <Table
        initialData={transactions}
        isLoading={isLoading}
        estimatedItemSize={48}
        displayRows={12}
        onLoadMore={handleLoadMoreDate}
        className={classes.table}
      >
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
        <Column
          label="Show Info"
          name="actions"
          align="right"
          type="custom"
          format={(
            _value: any,
            { id, paymentId, key }: { status: string; id: number; paymentId: number; key: string }
          ) => {
            return <InfoButton transactionId={id} transactionKey={key} paymentId={paymentId} />;
          }}
          style={{ minWidth: 96 }}
        />
        <Column
          label="Actions"
          name="actions"
          align="right"
          type="custom"
          format={(value, row: PlayerPayment) => {
            return (
              <ActionsButton
                row={row}
                onCancel={onCancel}
                onConfirm={onConfirm}
                onEditWagering={onEditWagering}
                onCompleteDepositTransaction={onCompleteDepositTransaction}
                paymentAccess={paymentAccess}
              />
            );
          }}
          style={{ minWidth: 96 }}
        />
      </Table>
    </Box>
  );
};

export { PaymentTransactionsTable };
