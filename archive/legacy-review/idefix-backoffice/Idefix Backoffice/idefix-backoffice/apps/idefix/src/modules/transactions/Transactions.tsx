import { FC } from "react";
import Box from "@mui/material/Box";

import { useTransactions } from "./hooks";
import { TransactionsTable } from "./components/TransactionsTable";
import { GamesSummaryTable } from "./components/GamesSummaryTable";
import { DateRangePicker } from "@idefix-backoffice/idefix/components";

const Transactions: FC = () => {
  const {
    transactions,
    isLoadingTransactions,
    transactionDates,
    selectedPeriod,
    handleFetchTransactions,
    games,
    isLoadingGames,
    playerId,
    handleSubmit,
    handleCloseRound,
    handleRefundRound
  } = useTransactions();

  return (
    <Box>
      <DateRangePicker value={selectedPeriod} highlightDates={transactionDates} onSubmit={handleSubmit} disableFuture />
      <Box mt={3}>
        <GamesSummaryTable games={games} isLoading={isLoadingGames} />
      </Box>
      <Box mt={3}>
        <TransactionsTable
          playerId={playerId}
          transactions={transactions}
          isLoading={isLoadingTransactions}
          onClose={handleCloseRound}
          onRefund={handleRefundRound}
          onFetchTransactions={handleFetchTransactions}
        />
      </Box>
    </Box>
  );
};

export { Transactions };
