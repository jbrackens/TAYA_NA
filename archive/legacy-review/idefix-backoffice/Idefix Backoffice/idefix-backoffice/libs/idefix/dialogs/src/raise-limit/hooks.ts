import { FormikHelpers } from "formik";
import { useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { ActiveLimit, LimitType, DIALOG } from "@idefix-backoffice/idefix/types";

import { raiseLimit } from "./actions";

interface Payload {
  playerId: number;
  limit: ActiveLimit;
  type: LimitType;
}

const useRaiseLimit = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const {
    playerId,
    limit: { id }
  } = payload;

  const handleRaiseLimit = useCallback(
    ({ period, limit, reason }: any, formikActions: FormikHelpers<any>) => {
      const valuesDraft = {
        limit: limit || undefined,
        period: period || undefined,
        reason
      };

      dispatch(raiseLimit(playerId, id, valuesDraft, formikActions));
    },
    [dispatch, id, playerId]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.RAISE_LIMIT)), [dispatch]);

  const type = payload?.type;
  const period = payload?.limit?.periodType;
  const limit = payload?.limit?.limitValue;
  const initialLimit = payload?.limit?.limitValue;

  const initialValues = useMemo(
    () =>
      (payload &&
        payload.limit && {
          limit,
          period: ["deposit", "loss", "bet"].includes(type) && period
        }) ||
      {},
    [limit, payload, period, type]
  );

  const requiresCheck = period !== initialValues.period || limit > initialLimit;
  const canBeCancelled = payload?.limit?.canBeCancelled;
  const cancellationDays = payload?.limit?.cancellationDays;
  const error = requiresCheck && !canBeCancelled && `Limit must have at least ${cancellationDays} days till the end`;

  return { handleRaiseLimit, handleClose, initialValues, type, error };
};

export { useRaiseLimit };
