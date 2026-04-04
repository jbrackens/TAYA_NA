import React, { useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ActiveLimit, ActiveLimitOptions, LimitType } from "app/types";
import {
  fetchActiveLimits,
  fetchHistory,
  getActiveLimits,
  getActiveLimitsLoading,
  getLimitsHistory,
  getLimitsHistoryLoading,
} from "./limitsSlice";
import Component from "./Component";
import { openDialog } from "../../dialogs";

const Container = () => {
  const dispatch = useDispatch();
  const limits = useSelector(getActiveLimits);
  const isLoadingActiveLimits = useSelector(getActiveLimitsLoading);
  const history = useSelector(getLimitsHistory);
  const isLoadingHistory = useSelector(getLimitsHistoryLoading);
  const params = useParams();
  const playerId = Number(params.playerId);

  useEffect(() => {
    dispatch(fetchActiveLimits(playerId));
    dispatch(fetchHistory(playerId));
  }, [dispatch, playerId]);

  const handleOpenSetLimitDialog = useCallback(
    (type: LimitType) => () => dispatch(openDialog("set-limit", { type, playerId })),
    [dispatch, playerId],
  );

  const handleOpenCancelLimitConfirmationDialog = useCallback(
    (
        limit: {
          exclusionKey: string;
          type: LimitType;
        },
        delay: boolean,
      ) =>
      () =>
        dispatch(openDialog("cancel-limit", { limit, delay, playerId })),
    [dispatch, playerId],
  );

  const handleOpenRaiseLimitDialog = useCallback(
    (limit: ActiveLimit, type: LimitType) => () => dispatch(openDialog("raise-limit", { limit, type, playerId })),
    [dispatch, playerId],
  );

  return (
    <Component
      isLoadingActiveLimits={isLoadingActiveLimits}
      isLoadingHistory={isLoadingHistory}
      limits={limits as ActiveLimitOptions}
      history={history}
      playerId={playerId}
      onOpenSetLimitDialog={handleOpenSetLimitDialog}
      onOpenCancelLimitConfirmationDialog={handleOpenCancelLimitConfirmationDialog}
      onOpenRaiseLimitDialog={handleOpenRaiseLimitDialog}
    />
  );
};

export default Container;
