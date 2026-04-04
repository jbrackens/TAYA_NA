import React, { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import Component from "./Component";
import {
  cancelPaymentTransaction,
  changeFilterValue,
  fetchPaymentAccounts,
  fetchPaymentTransactions,
  fetchPaymentTransactionsEventLogs,
  getPaymentsState,
  updateAccountActive,
  updateAccountWithdrawals,
} from "./paymentsSlice";
import { openDialog } from "../../dialogs";
import { getPaymentAccess } from "../authentication";
import { useParams } from "react-router-dom";
import { PlayerAccount } from "app/types";
import { SortDirection } from "@material-ui/core";

const Container = () => {
  const dispatch = useDispatch();
  const { filters, isFetchingTransactions, transactions, isFetchingAccounts, accounts, description } =
    useSelector(getPaymentsState);
  const paymentAccess = useSelector(getPaymentAccess);
  const params = useParams();
  const playerId = Number(params.playerId);

  const filtersList = useMemo(() => Object.keys(filters), [filters]);

  const fetchData = useCallback(() => {
    dispatch(fetchPaymentTransactions({ playerId }));
    dispatch(fetchPaymentAccounts(playerId));
  }, [dispatch, playerId]);

  // const handleFetchEventLogs = useCallback(
  //   (paymentId: number) => dispatch(fetchPaymentTransactionsEventLogs({ playerId, paymentId })),
  //   [playerId, dispatch],
  // );

  const handleFilterCheck = useCallback(
    (filter: string, value: boolean, text?: string) => {
      dispatch(changeFilterValue({ filter, value }));
      dispatch(fetchPaymentTransactions({ playerId, text }));
    },
    [dispatch, playerId],
  );

  const handleCancelTransaction = useCallback(
    (id: string) => dispatch(cancelPaymentTransaction({ playerId, transactionKey: id })),
    [playerId, dispatch],
  );

  const handleConfirmTransaction = useCallback(
    (id: string) => dispatch(openDialog("confirm-withdrawal", { playerId, withdrawalId: id })),
    [dispatch, playerId],
  );

  const handleToggleAccountActive = useCallback(
    (accountId: number, active: boolean) => dispatch(updateAccountActive({ playerId, accountId, active })),
    [dispatch, playerId],
  );

  const handleToggleAccountWithdrawals = useCallback(
    (accountId: number, withdrawals: boolean) =>
      dispatch(updateAccountWithdrawals({ playerId, accountId, withdrawals })),
    [dispatch, playerId],
  );

  const handleKycClick = useCallback(
    (account: PlayerAccount) => dispatch(openDialog("view-payment-account", { playerId, account })),
    [dispatch, playerId],
  );

  const handleEditWagering = useCallback(
    (payment: { counterId: number }) => dispatch(openDialog("edit-payment-wagering", { playerId, payment })),
    [dispatch, playerId],
  );

  const handleCompleteDepositTransaction = useCallback(
    (transactionKey: string, transactionId: string) =>
      dispatch(openDialog("complete-deposit-transaction", { playerId, transactionKey, transactionId })),
    [dispatch, playerId],
  );

  const handleFetchPaymentsTransactions = useCallback(
    (pageSize?: number, text?: string, sortBy?: string, sortDirection?: SortDirection) =>
      dispatch(fetchPaymentTransactions({ playerId, pageSize, text, sortBy, sortDirection })),
    [dispatch, playerId],
  );

  useEffect(() => {
    fetchData();
  }, [dispatch, playerId, fetchData]);

  return (
    <Component
      filters={filters}
      filtersList={filtersList}
      playerId={playerId}
      transactions={transactions}
      isFetchingTransactions={isFetchingTransactions}
      isFetchingAccounts={isFetchingAccounts}
      accounts={accounts}
      onFilterCheck={handleFilterCheck}
      onCancelTransaction={handleCancelTransaction}
      onConfirmTransaction={handleConfirmTransaction}
      onToggleAccountActive={handleToggleAccountActive}
      onToggleAccountWithdrawals={handleToggleAccountWithdrawals}
      onKycClick={handleKycClick}
      onEditWagering={handleEditWagering}
      onCompleteDepositTransaction={handleCompleteDepositTransaction}
      description={description}
      paymentAccess={paymentAccess}
      onFetchPaymentsTransactions={handleFetchPaymentsTransactions}
    />
  );
};

export default Container;
