import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import {
  closeRound,
  fetchGamesSummary,
  fetchTransactions,
  fetchTransactionsDates,
  fetchWithdrawals,
  getTransactions,
  onDatesChange,
  refundRound,
  TransactionParams,
} from "./transactionsSlice";
import Component from "./Component";
import { MaterialUiPickersDate } from "@material-ui/pickers/typings/date";

const Container = () => {
  const dispatch = useDispatch();
  const { isFetchingTransactions, transactions, transactionsDates, period, games, isFetchingGames } =
    useSelector(getTransactions);
  const params = useParams();
  const playerId = Number(params.playerId);

  useEffect(() => {
    dispatch(fetchTransactions({ playerId }));
    dispatch(fetchTransactionsDates({ playerId }));
    dispatch(fetchGamesSummary({ playerId }));
    dispatch(fetchWithdrawals({ playerId }));
  }, [dispatch, playerId]);

  const handleCloseRound = useCallback(
    async (roundId: number) => {
      try {
        await dispatch(closeRound({ roundId }));
        dispatch(fetchTransactions({ playerId }));
      } catch (error) {
        console.log(error);
      }
    },
    [dispatch, playerId],
  );

  const handleRefundRound = useCallback(
    async (roundId: number) => {
      try {
        await dispatch(refundRound({ roundId }));
        dispatch(fetchTransactions({ playerId }));
      } catch (error) {
        console.log(error);
      }
    },
    [dispatch, playerId],
  );

  const handleDatesChange = useCallback(
    ({ startDate, endDate }: { startDate: Date | MaterialUiPickersDate; endDate: Date | MaterialUiPickersDate }) => {
      dispatch(onDatesChange({ startDate, endDate }));
      dispatch(fetchTransactions({ playerId }));
      dispatch(fetchGamesSummary({ playerId }));
    },
    [dispatch, playerId],
  );

  const handleFetchTransactions = useCallback(
    async (params: TransactionParams) => {
      dispatch(fetchTransactions({ playerId, ...params }));
    },
    [dispatch, playerId],
  );

  return (
    <Component
      playerId={playerId}
      isFetchingTransactions={Boolean(isFetchingTransactions)}
      isFetchingGames={isFetchingGames}
      transactions={transactions}
      transactionsDates={transactionsDates}
      period={period}
      games={games}
      onDatesChange={handleDatesChange}
      onRefundRound={handleRefundRound}
      onCloseRound={handleCloseRound}
      onFetchTransactions={handleFetchTransactions}
    />
  );
};

export default Container;
