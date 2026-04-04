import React, { FC, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { formatPendingTime } from "./utils";
import {
  changeValue,
  fetchEvents,
  fetchNotes,
  fetchWithdrawal,
  getUserId,
  getWithdrawalTask,
} from "./withdrawalTaskSlice";
import Component from "./Component";
import { openDialog } from "../../dialogs";

const Container: FC = () => {
  const dispatch = useDispatch();
  const { isFetchingWithdrawals, withdrawal, isFetchingNotes, notes, isFetchingEvents, events, values } =
    useSelector(getWithdrawalTask);

  const userId = useSelector(getUserId);
  const { playerId, withdrawalId } = useParams();

  const delay = withdrawal?.delayedAcceptTime;
  const time = delay ? formatPendingTime(delay) : null;

  useEffect(() => {
    if (withdrawalId) {
      dispatch(fetchWithdrawal(withdrawalId));
      dispatch(fetchNotes(Number(playerId)));
      dispatch(fetchEvents(withdrawalId));
    }
  }, [dispatch, playerId, withdrawalId]);

  const handleAccept = useCallback(() => {
    dispatch(
      openDialog("accept-withdrawal", {
        playerId,
        withdrawalId,
        paymentProviderId: values.paymentProviderId,
        amount: Math.round(Number(values.amount) * 100),
      }),
    );
  }, [dispatch, playerId, values, withdrawalId]);

  const handleAcceptWithDelay = useCallback(() => {
    dispatch(
      openDialog("accept-withdrawal-with-delay", {
        playerId,
        withdrawalId,
        paymentProviderId: values.paymentProviderId,
        amount: Math.round(Number(values.amount) * 100),
      }),
    );
  }, [dispatch, playerId, values, withdrawalId]);

  const handleCloseWithdrawal = useCallback(() => {
    dispatch(openDialog("confirm-cancel-withdrawal", { playerId, withdrawalId }));
  }, [dispatch, playerId, withdrawalId]);

  const handleChange = useCallback(
    (key: string, value: string) => {
      dispatch(changeValue({ key, value }));
    },
    [dispatch],
  );

  return (
    <Component
      playerId={playerId}
      isFetchingWithdrawals={isFetchingWithdrawals}
      withdrawal={withdrawal}
      isFetchingNotes={isFetchingNotes}
      notes={notes}
      isFetchingEvents={isFetchingEvents}
      events={events}
      values={values}
      onChangeValue={handleChange}
      onAccept={handleAccept}
      onAcceptWithDelay={handleAcceptWithDelay}
      onCloseWithdrawal={handleCloseWithdrawal}
      userId={userId!}
      delay={time}
    />
  );
};

export default Container;
