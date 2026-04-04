import React from "react";
import moment from "moment-timezone";
import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/styles";
import TransactionsTable from "./components/TransactionsTable";
import GamesSummaryTable from "./components/GamesSummaryTable";
import DateRangePicker from "../../core/components/material-date-range";
import { Typography } from "@material-ui/core";
import { GamesSummary, PlayerTransaction, TransactionDate } from "app/types";
import { MaterialUiPickersDate } from "@material-ui/pickers/typings/date";
import { TransactionParams } from "./transactionsSlice";

const useStyles = makeStyles({
  transactions: {
    position: "absolute",
    width: "100%",
    height: "100%",
    padding: 24,
    display: "flex",
    flexDirection: "column",
  },
  transactionsTitle: {
    marginBottom: 5,
    fontWeight: "bold",
  },
  summaryTable: {
    minHeight: 200,
  },
  transactionsTable: {
    marginBottom: 24,
  },
});

interface Props {
  playerId: number;
  transactions: PlayerTransaction[];
  transactionsDates: TransactionDate[];
  games: GamesSummary[];
  period: {
    startDate?: string | null;
    endDate?: string | null;
  };
  isFetchingGames: boolean;
  isFetchingTransactions: boolean;
  onCloseRound: (roundId: number) => void;
  onRefundRound: (roundId: number) => void;
  onDatesChange: ({
    startDate,
    endDate,
  }: {
    startDate: Date | MaterialUiPickersDate;
    endDate: Date | MaterialUiPickersDate;
  }) => void;
  onFetchTransactions: (params: TransactionParams) => void;
}

export default ({
  playerId,
  transactions,
  transactionsDates,
  games,
  period,
  isFetchingGames,
  isFetchingTransactions,
  onCloseRound,
  onRefundRound,
  onDatesChange,
  onFetchTransactions,
}: Props) => {
  const classes = useStyles();

  return (
    <Box className={classes.transactions}>
      <Typography classes={{ root: classes.transactionsTitle }}>Account Activity</Typography>
      <Box mt={2}>
        <DateRangePicker
          value={{
            startDate: typeof period.startDate !== "object" ? moment(period.startDate) : period.startDate,
            endDate: typeof period.endDate !== "object" ? moment(period.endDate) : period.endDate,
          }}
          onDatesChange={onDatesChange}
          disableFuture
          highlightDates={transactionsDates}
        />
      </Box>
      <Box mt={3}>
        <Box className={classes.summaryTable}>
          <GamesSummaryTable games={games} isLoading={isFetchingGames} />
        </Box>
      </Box>
      <Box mt={3} paddingBottom={12}>
        <Box className={classes.transactionsTable}>
          <TransactionsTable
            playerId={playerId}
            transactions={transactions}
            isLoading={isFetchingTransactions}
            onClose={onCloseRound}
            onRefund={onRefundRound}
            onFetchTransactions={onFetchTransactions}
          />
        </Box>
      </Box>
    </Box>
  );
};
