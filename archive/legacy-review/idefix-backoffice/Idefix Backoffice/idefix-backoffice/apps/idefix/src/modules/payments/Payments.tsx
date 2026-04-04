import { FC } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { usePayments } from "./hooks";
import { PaymentAccountsTable } from "./components/PaymentAccountsTable";
import { PaymentTransactionsTable } from "./components/PaymentTransactionsTable";

const Payments: FC = () => {
  const {
    playerId,
    filters,
    filtersList,
    description,
    paymentAccess,
    transactions,
    isLoadingTransactions,
    accounts,
    isLoadingAccounts,
    handleFilterCheck,
    handleCancelTransaction,
    handleConfirmTransaction,
    handleToggleAccountActive,
    handleToggleAccountWithdrawals,
    handleKycClick,
    handleEditWagering,
    handleCompleteDepositTransaction,
    handleFetchPaymentsTransactions
  } = usePayments();

  return (
    <Box>
      <Box>
        <Typography>{description}</Typography>
      </Box>
      <Box mt={3}>
        <PaymentAccountsTable
          accounts={accounts}
          isLoading={isLoadingAccounts}
          onToggleAccountWithdrawals={handleToggleAccountWithdrawals}
          onToggleAccountActive={handleToggleAccountActive}
          onKycClick={handleKycClick}
        />
      </Box>
      <Box mt={3}>
        <PaymentTransactionsTable
          playerId={playerId}
          transactions={transactions}
          isLoading={isLoadingTransactions}
          onCancel={handleCancelTransaction}
          onConfirm={handleConfirmTransaction}
          onEditWagering={handleEditWagering}
          onCompleteDepositTransaction={handleCompleteDepositTransaction}
          paymentAccess={paymentAccess}
          onFetchPaymentsTransactions={handleFetchPaymentsTransactions}
          onFilterCheck={handleFilterCheck}
          filtersList={filtersList}
          filters={filters}
        />
      </Box>
    </Box>
  );
};

export { Payments };
