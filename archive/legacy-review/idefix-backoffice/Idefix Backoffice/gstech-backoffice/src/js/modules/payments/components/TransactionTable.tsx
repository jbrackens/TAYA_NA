import React, { ChangeEvent, useCallback, useState } from "react";
import { PlayerPayment } from "app/types";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import { SortDirection } from "@material-ui/core";

import Table, { Column } from "../../../core/components/table";
import Search from "../../../core/components/search";
import { DownloadAllCsvButton } from "../../../core/components/button";
import debounce from "lodash/debounce";
import DropdownFilter from "../../../core/components/dropdown-filter";
import InfoButton from "./InfoButton";
import ActionsButton from "./ActionsButton";
import { columns, CSV_HEADERS, fetchFormattedPaymentTransactions } from "../helpers";

const useStyles = makeStyles(() =>
  createStyles({
    table: {
      minWidth: 1540,
    },
  }),
);

interface Props {
  playerId: number;
  transactions: PlayerPayment[];
  isLoading: boolean;
  paymentAccess: boolean;
  onCancel: (id: string) => void;
  onConfirm: (id: string) => void;
  onEditWagering: (payment: { counterId: number }) => void;
  onCompleteDepositTransaction: (transactionKey: string, transactionId: string) => void;
  onFetchPaymentsTransactions: (
    pageSize?: number,
    text?: string,
    sortBy?: string,
    sortDirection?: SortDirection,
  ) => void;
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

export default ({
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
  filters,
}: Props) => {
  const classes = useStyles();
  const [query, setQuery] = useState<string>("");
  const isEmpty = transactions.length === 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounced = useCallback(
    debounce(
      (text, sortBy?: string, sortDirection?: SortDirection) =>
        onFetchPaymentsTransactions(100, text, sortBy, sortDirection),
      500,
    ),
    [],
  );

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const text = event.target.value;
      setQuery(text);
      debounced(text);
    },
    [debounced],
  );

  const handleLoadMoreDate = useCallback(
    (pageSize: number, sortBy?: string, sortDirection?: SortDirection) => {
      if (!query) {
        onFetchPaymentsTransactions(pageSize, query, sortBy, sortDirection);
      }
    },
    [onFetchPaymentsTransactions, query],
  );

  const handleFetchAllPaymentsTransactions = useCallback(async () => {
    return await fetchFormattedPaymentTransactions(playerId, {
      status: filters,
      pageSize: 0,
      text: query,
    });
  }, [filters, playerId, query]);

  const handleCheck = useCallback(
    (query: string) => (filter: string) => (event: React.ChangeEvent<HTMLInputElement>, value?: boolean) => {
      onFilterCheck(filter, Boolean(value), query);
    },
    [onFilterCheck],
  );

  const handleSort = useCallback(
    (sortBy: string, sortDirection: SortDirection) => {
      debounced(query, sortBy, sortDirection);
    },
    [debounced, query],
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
            <DropdownFilter list={filtersList} filters={filters} onFilterCheck={handleCheck(query)} />
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
        onSort={handleSort}
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
            { id, paymentId, key }: { status: string; id: number; paymentId: number; key: string },
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
