import { ChangeEvent, FC, useCallback, useState } from "react";
import debounce from "lodash/debounce";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { makeStyles } from "@mui/styles";

import { PlayerTransaction } from "@idefix-backoffice/idefix/types";
import { transactionsSlice, useAppSelector } from "@idefix-backoffice/idefix/store";
import { Column, DownloadAllCsvButton, Search, Table } from "@idefix-backoffice/idefix/components";

import { columns, CSV_HEADERS, fetchFormattedTransactions, renderClosedColumnAction } from "../helpers";

const useStyles = makeStyles({
  table: {
    minWidth: 1784
  }
});

interface Props {
  playerId: number;
  transactions: PlayerTransaction[];
  isLoading: boolean;
  onClose: (roundId: number) => void;
  onRefund: (roundId: number) => void;
  onFetchTransactions: (pageSize?: number, text?: string) => void;
}

const TransactionsTable: FC<Props> = ({
  playerId,
  transactions,
  isLoading,
  onClose,
  onRefund,
  onFetchTransactions
}) => {
  const classes = useStyles();
  const { startDate, endDate } = useAppSelector(transactionsSlice.getTransactionsPeriod);
  const [query, setQuery] = useState<string>("");
  const isEmpty = transactions.length === 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounced = useCallback(
    debounce(query => onFetchTransactions(100, query), 500),
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
        onFetchTransactions(pageSize, query);
      }
    },
    [onFetchTransactions, query]
  );

  const handleFetchAllTransactions = useCallback(async () => {
    if (startDate && endDate) {
      return await fetchFormattedTransactions(playerId, {
        startDate,
        endDate,
        pageSize: 0,
        text: query
      });
    }
    return;
  }, [endDate, playerId, query, startDate]);

  return (
    <Box>
      <Typography variant="subtitle2">Transactions</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={false}
        buttons={
          <DownloadAllCsvButton
            headers={CSV_HEADERS}
            onFetchData={handleFetchAllTransactions}
            disabled={isEmpty || isLoading}
            fileName="transactions.csv"
            tooltipText="Download all transactions"
          />
        }
      />
      <Box minHeight="638px">
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
            label="Closed"
            name="closed"
            align="right"
            type="custom"
            format={renderClosedColumnAction(onClose, onRefund)}
            style={{ minWidth: 52 }}
          />
        </Table>
      </Box>
    </Box>
  );
};

export { TransactionsTable };
