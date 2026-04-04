import { useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";

import {
  useAppDispatch,
  dialogsSlice,
  paymentsSlice,
  useAppSelector,
  authenticationSlice
} from "@idefix-backoffice/idefix/store";
import { PlayerAccount } from "@idefix-backoffice/idefix/types";

export const usePayments = () => {
  const dispatch = useAppDispatch();
  const paymentAccess = useAppSelector(authenticationSlice.getPaymentAccess);
  const description = useAppSelector(paymentsSlice.getDescription);
  const filters = useAppSelector(paymentsSlice.getFilters);
  const transactions = useAppSelector(paymentsSlice.getTransactions);
  const isLoadingTransactions = useAppSelector(paymentsSlice.getIsLoadingTransactions);
  const accounts = useAppSelector(paymentsSlice.getAccounts);
  const isLoadingAccounts = useAppSelector(paymentsSlice.getIsLoadingAccounts);
  const params = useParams<{ playerId: string }>();
  const filtersList = useMemo(() => Object.keys(filters), [filters]);
  const playerId = Number(params.playerId);

  const handleFilterCheck = useCallback(
    (filter: string, value: boolean, text?: string) => {
      dispatch(paymentsSlice.changeFilterValue({ filter, value }));
      dispatch(paymentsSlice.fetchPaymentTransactions({ playerId, text }));
    },
    [dispatch, playerId]
  );

  const handleCancelTransaction = useCallback(
    (id: string) => dispatch(paymentsSlice.cancelPaymentTransaction({ playerId, transactionKey: id })),
    [playerId, dispatch]
  );

  const handleConfirmTransaction = useCallback(
    (id: string) => dispatch(dialogsSlice.openDialog("confirm-withdrawal", { playerId, withdrawalId: id })),
    [dispatch, playerId]
  );

  const handleToggleAccountActive = useCallback(
    (accountId: number, active: boolean) =>
      dispatch(paymentsSlice.updateAccountActive({ playerId, accountId, active })),
    [dispatch, playerId]
  );

  const handleToggleAccountWithdrawals = useCallback(
    (accountId: number, withdrawals: boolean) =>
      dispatch(paymentsSlice.updateAccountWithdrawals({ playerId, accountId, withdrawals })),
    [dispatch, playerId]
  );

  const handleKycClick = useCallback(
    (account: PlayerAccount) => dispatch(dialogsSlice.openDialog("view-payment-account", { playerId, account })),
    [dispatch, playerId]
  );

  const handleEditWagering = useCallback(
    (payment: { counterId: number }) =>
      dispatch(dialogsSlice.openDialog("edit-payment-wagering", { playerId, payment })),
    [dispatch, playerId]
  );

  const handleCompleteDepositTransaction = useCallback(
    (transactionKey: string, transactionId: string) =>
      dispatch(dialogsSlice.openDialog("complete-deposit-transaction", { playerId, transactionKey, transactionId })),
    [dispatch, playerId]
  );

  const handleFetchPaymentsTransactions = useCallback(
    (pageSize?: number, text?: string) =>
      dispatch(paymentsSlice.fetchPaymentTransactions({ playerId, pageSize, text })),
    [dispatch, playerId]
  );

  useEffect(() => {
    dispatch(paymentsSlice.fetchPaymentAccounts(playerId));
    dispatch(paymentsSlice.fetchPaymentTransactions({ playerId }));
  }, [dispatch, playerId]);

  return {
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
  };
};
