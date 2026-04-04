import { useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector, transactionsSlice } from "@idefix-backoffice/idefix/store";

export const useTransactions = () => {
  const dispatch = useAppDispatch();
  const transactions = useAppSelector(transactionsSlice.getTransactions);
  const isLoadingTransactions = useAppSelector(transactionsSlice.getIsLoadingTransactions);
  const transactionDates = useAppSelector(transactionsSlice.getTransactionsDates);
  const period = useAppSelector(transactionsSlice.getTransactionsPeriod);
  const games = useAppSelector(transactionsSlice.getGames);
  const isLoadingGames = useAppSelector(transactionsSlice.getIsLoadingGames);

  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);
  const selectedPeriod = {
    startDate: period.startDate && typeof period.startDate !== "object" ? new Date(period.startDate) : period.startDate,
    endDate: period.endDate && typeof period.endDate !== "object" ? new Date(period.endDate) : period.endDate
  };

  const handleFetchTransactions = useCallback(
    async (pageSize?: number, text?: string) => {
      dispatch(transactionsSlice.fetchTransactions({ playerId, pageSize, text }));
    },
    [dispatch, playerId]
  );

  const handleSubmit = useCallback(
    ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
      dispatch(transactionsSlice.onDatesChange({ startDate, endDate }));
      dispatch(transactionsSlice.fetchTransactions({ playerId }));
      dispatch(transactionsSlice.fetchGamesSummary({ playerId }));
    },
    [dispatch, playerId]
  );

  const handleCloseRound = useCallback(
    async (roundId: number) => {
      try {
        await dispatch(transactionsSlice.closeRound({ roundId }));
        dispatch(transactionsSlice.fetchTransactions({ playerId }));
      } catch (error) {
        console.log(error);
      }
    },
    [dispatch, playerId]
  );

  const handleRefundRound = useCallback(
    async (roundId: number) => {
      try {
        await dispatch(transactionsSlice.refundRound({ roundId }));
        dispatch(transactionsSlice.fetchTransactions({ playerId }));
      } catch (error) {
        console.log(error);
      }
    },
    [dispatch, playerId]
  );

  useEffect(() => {
    if (playerId) {
      dispatch(transactionsSlice.fetchTransactions({ playerId }));
      dispatch(transactionsSlice.fetchTransactionsDates({ playerId }));
      dispatch(transactionsSlice.fetchGamesSummary({ playerId }));
      dispatch(transactionsSlice.fetchWithdrawals({ playerId }));
    }
  }, [dispatch, playerId]);

  return {
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
  };
};
