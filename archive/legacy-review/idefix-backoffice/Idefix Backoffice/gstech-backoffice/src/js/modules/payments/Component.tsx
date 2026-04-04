import React, { memo } from "react";
import Box from "@material-ui/core/Box";
import TransactionsTable from "./components/TransactionTable";
import AccountsTable from "./components/AccountsTable";
import { PlayerAccount, PlayerPayment } from "app/types";
import { Typography } from "@material-ui/core";

interface Props {
  filters: {
    complete: boolean;
    pending: boolean;
    failed: boolean;
    cancelled: boolean;
    created: boolean;
  };
  filtersList: string[];
  playerId: number;
  transactions: PlayerPayment[];
  isFetchingTransactions: boolean;
  isFetchingAccounts: boolean;
  accounts: PlayerAccount[];
  description: string;
  paymentAccess: boolean;
  onFilterCheck: (filter: string, value: boolean, text?: string) => void;
  onCancelTransaction: (id: string) => void;
  onConfirmTransaction: (id: string) => void;
  onToggleAccountActive: (accountId: number, active: boolean) => void;
  onToggleAccountWithdrawals: (accountId: number, withdrawals: boolean) => void;
  onKycClick: (account: PlayerAccount) => void;
  onEditWagering: (payment: { counterId: number }) => void;
  onCompleteDepositTransaction: (transactionKey: string, transactionId: string) => void;
  onFetchPaymentsTransactions: (pageSize?: number, text?: string) => void;
}

export default memo(
  ({
    filters,
    filtersList,
    playerId,
    transactions,
    isFetchingTransactions,
    isFetchingAccounts,
    accounts,
    description,
    onFilterCheck,
    onCancelTransaction,
    onConfirmTransaction,
    onToggleAccountActive,
    onToggleAccountWithdrawals,
    onKycClick,
    onEditWagering,
    onCompleteDepositTransaction,
    paymentAccess,
    onFetchPaymentsTransactions,
  }: Props) => (
    <Box display="flex" flexDirection="column" p={3}>
      <Box>
        <Box display="flex" flexDirection="column" flexGrow={1} minHeight="200px">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="body2">{description}</Typography>
            </Box>
          </Box>
          <Box mt={1}>
            <AccountsTable
              accounts={accounts}
              isLoading={isFetchingAccounts}
              onToggleAccountWithdrawals={onToggleAccountWithdrawals}
              onToggleAccountActive={onToggleAccountActive}
              onKycClick={onKycClick}
            />
          </Box>
        </Box>

        <Box display="flex" flexDirection="column" mt={3}>
          <Box display="flex" flexDirection="column" flexGrow={1} minHeight="200px" mt={1} paddingBottom={12}>
            <TransactionsTable
              playerId={playerId}
              transactions={transactions}
              isLoading={isFetchingTransactions}
              onCancel={onCancelTransaction}
              onConfirm={onConfirmTransaction}
              onEditWagering={onEditWagering}
              onCompleteDepositTransaction={onCompleteDepositTransaction}
              paymentAccess={paymentAccess}
              onFetchPaymentsTransactions={onFetchPaymentsTransactions}
              onFilterCheck={onFilterCheck}
              filtersList={filtersList}
              filters={filters}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  ),
);
