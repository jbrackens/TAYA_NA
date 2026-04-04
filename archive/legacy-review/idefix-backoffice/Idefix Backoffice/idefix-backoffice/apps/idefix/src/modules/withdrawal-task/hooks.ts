import { useParams } from "react-router-dom";
import { useCallback, useEffect } from "react";

import {
  useAppDispatch,
  useAppSelector,
  withdrawalTaskSlice,
  authenticationSlice,
  dialogsSlice
} from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";
import { formatPendingTime } from "./utils";

export const useWithdrawalTask = () => {
  const dispatch = useAppDispatch();
  const withdrawal = useAppSelector(withdrawalTaskSlice.getWithdrawal);
  const isLoadingWithdrawal = useAppSelector(withdrawalTaskSlice.getIsLoadingWithdrawal);
  const notes = useAppSelector(withdrawalTaskSlice.getNotes);
  const isLoadingNotes = useAppSelector(withdrawalTaskSlice.getIsLoadingNotes);
  const events = useAppSelector(withdrawalTaskSlice.getEvents);
  const isLoadingEvents = useAppSelector(withdrawalTaskSlice.getIsLoadingEvents);
  const values = useAppSelector(withdrawalTaskSlice.getValues);
  const userId = useAppSelector(authenticationSlice.getUserId);
  const params = useParams<{ playerId: string; withdrawalId: string }>();
  const playerId = Number(params.playerId);
  const withdrawalId = params.withdrawalId;
  const delay = withdrawal?.delayedAcceptTime;
  const time = delay ? formatPendingTime(delay) : null;

  const handleAccept = useCallback(() => {
    if (playerId && withdrawalId) {
      dispatch(
        dialogsSlice.openDialog(DIALOG.ACCEPT_WD, {
          playerId,
          withdrawalId,
          paymentProviderId: values.paymentProviderId,
          amount: Math.round(Number(values.amount) * 100)
        })
      );
    }
  }, [dispatch, playerId, values, withdrawalId]);

  const handleAcceptWithDelay = useCallback(() => {
    if (playerId && withdrawalId) {
      dispatch(
        dialogsSlice.openDialog(DIALOG.ACCEPT_WD_WITH_DELAY, {
          playerId,
          withdrawalId,
          paymentProviderId: values.paymentProviderId,
          amount: Math.round(Number(values.amount) * 100)
        })
      );
    }
  }, [dispatch, playerId, values, withdrawalId]);

  const handleCloseWithdrawal = useCallback(() => {
    if (playerId && withdrawalId) {
      dispatch(dialogsSlice.openDialog(DIALOG.CONFIRM_CANCEL_WD, { playerId, withdrawalId }));
    }
  }, [dispatch, playerId, withdrawalId]);

  const handleChange = useCallback(
    (key: string, value: string) => {
      dispatch(withdrawalTaskSlice.changeValue({ key, value }));
    },
    [dispatch]
  );

  useEffect(() => {
    if (withdrawalId) {
      dispatch(withdrawalTaskSlice.fetchWithdrawal(withdrawalId));
      dispatch(withdrawalTaskSlice.fetchNotes(Number(playerId)));
      dispatch(withdrawalTaskSlice.fetchEvents(withdrawalId));
    }
  }, [dispatch, playerId, withdrawalId]);

  return {
    playerId,
    withdrawal,
    isLoadingWithdrawal,
    notes,
    isLoadingNotes,
    events,
    isLoadingEvents,
    values,
    userId,
    delay: time,
    handleAccept,
    handleAcceptWithDelay,
    handleCloseWithdrawal,
    handleChange
  };
};
