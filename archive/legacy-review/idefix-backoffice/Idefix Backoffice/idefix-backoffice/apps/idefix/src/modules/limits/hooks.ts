import { useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";

import { dialogsSlice, limitsSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";
import { ActiveLimit, LimitType } from "@idefix-backoffice/idefix/types";

export const useLimits = () => {
  const dispatch = useAppDispatch();
  const limitsHistory = useAppSelector(limitsSlice.getLimitsHistory);
  const isLoadingLimitsHistory = useAppSelector(limitsSlice.getIsLoadingLimitsHistory);
  const activeLimits = useAppSelector(limitsSlice.getActiveLimits);
  const isLoadingActiveLimits = useAppSelector(limitsSlice.getIsLoadingActiveLimits);
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);

  const handleOpenSetLimitDialog = useCallback(
    (type: LimitType) => () => dispatch(dialogsSlice.openDialog("set-limit", { type, playerId })),
    [dispatch, playerId]
  );

  const handleOpenCancelLimitConfirmationDialog = useCallback(
    (
        limit: {
          exclusionKey: string;
          type: LimitType;
        },
        delay: boolean
      ) =>
      () =>
        dispatch(dialogsSlice.openDialog("cancel-limit", { limit, delay, playerId })),
    [dispatch, playerId]
  );

  const handleOpenRaiseLimitDialog = useCallback(
    (limit: ActiveLimit, type: LimitType) => () =>
      dispatch(dialogsSlice.openDialog("raise-limit", { limit, type, playerId })),
    [dispatch, playerId]
  );

  useEffect(() => {
    dispatch(limitsSlice.fetchActiveLimits(playerId));
    dispatch(limitsSlice.fetchActiveLimits(playerId));
  }, [dispatch, playerId]);

  return {
    limitsHistory,
    isLoadingLimitsHistory,
    activeLimits,
    isLoadingActiveLimits,
    handleOpenSetLimitDialog,
    handleOpenCancelLimitConfirmationDialog,
    handleOpenRaiseLimitDialog
  };
};
