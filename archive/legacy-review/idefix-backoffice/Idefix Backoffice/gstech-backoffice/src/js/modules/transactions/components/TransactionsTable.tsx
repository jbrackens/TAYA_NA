import React, { ChangeEvent, useCallback, useState } from "react";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import { SortDirection } from "@material-ui/core";
import debounce from "lodash/debounce";
import { useDispatch, useSelector } from "react-redux";
import { PlayerTransaction } from "app/types";

import Search from "../../../core/components/search";
import { DownloadAllCsvButton } from "../../../core/components/button";
import Table, { Column } from "../../../core/components/table";
import { getTransactionsPeriod, fetchTicket, TransactionParams } from "../transactionsSlice";
import {
  columns,
  CSV_HEADERS,
  fetchFormattedTransactions,
  renderClosedColumnAction,
  renderShowInfoColumn,
} from "../helpers";
import { TransactionDrawer } from "./TransactionDrawer";

export const useStyles = makeStyles(theme =>
  createStyles({
    table: {
      minWidth: 1784,
    },
    loader: {
      width: "100%",
      height: "100%",
      minHeight: 128,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  }),
);

interface Props {
  playerId: number;
  transactions: PlayerTransaction[];
  isLoading: boolean;
  onClose: (roundId: number) => void;
  onRefund: (roundId: number) => void;
  onFetchTransactions: (params: TransactionParams) => void;
}

export default ({ playerId, transactions, isLoading, onClose, onRefund, onFetchTransactions }: Props) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const { startDate, endDate } = useSelector(getTransactionsPeriod);
  const [query, setQuery] = useState<string>("");
  const isEmpty = transactions.length === 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounced = useCallback(
    debounce(params => onFetchTransactions(params), 500),
    [],
  );

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const text = event.target.value;
      setQuery(text);
      debounced({ pageSize: 100, text });
    },
    [debounced],
  );

  const handleLoadMore = useCallback(
    (pageSize: number, sortBy?: string, sortDirection?: SortDirection) => {
      if (!query) {
        onFetchTransactions({ pageSize, text: query, sortBy, sortDirection });
      }
    },
    [onFetchTransactions, query],
  );

  const handleFetchAllTransactions = useCallback(async () => {
    if (startDate && endDate) {
      return await fetchFormattedTransactions(playerId, {
        startDate,
        endDate,
        pageSize: 0,
        text: query,
      });
    }
  }, [endDate, playerId, query, startDate]);

  const handleSort = useCallback(
    (sortBy: string, sortDirection: SortDirection) => {
      debounced({ pageSize: 100, text: query, sortBy, sortDirection });
    },
    [debounced, query],
  );

  const handleOpenDetails = useCallback(
    (transaction: PlayerTransaction) => {
      const externalRoundId = transaction.externalRoundId;
      setIsOpen(true);
      dispatch(fetchTicket({ externalRoundId }));
    },
    [dispatch],
  );

  const handleCloseDetails = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <Box>
      <Typography variant="subtitle2">Transactions</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={false}
        buttons={
          <Box display="flex">
            <DownloadAllCsvButton
              headers={CSV_HEADERS}
              onFetchData={handleFetchAllTransactions}
              disabled={isEmpty || isLoading}
              fileName="transactions.csv"
              tooltipText="Download all transactions"
            />
          </Box>
        }
      />
      <Box minHeight="638px">
        <Table
          initialData={transactions}
          isLoading={isLoading}
          estimatedItemSize={48}
          displayRows={12}
          onLoadMore={handleLoadMore}
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
            format={renderShowInfoColumn(handleOpenDetails)}
            style={{ minWidth: 96 }}
          />
          <Column
            label="Closed"
            name="closed"
            align="right"
            type="custom"
            format={renderClosedColumnAction(onClose, onRefund)}
            style={{ minWidth: 52 }}
          />
        </Table>
      </Box>
      <TransactionDrawer open={isOpen} onClose={handleCloseDetails} />
    </Box>
  );
};
