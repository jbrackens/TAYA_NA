import { useCallback } from "react";
import { FormikHelpers } from "formik";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { ActiveLimit, CancelLimitValues, DIALOG } from "@idefix-backoffice/idefix/types";

import { confirmCancelLimit } from "./actions";

interface Payload {
  delay: boolean;
  limit: ActiveLimit;
  playerId: number;
}

const useCancelLimit = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const cancellationDays = payload && payload.limit && payload.limit.cancellationDays;

  const handleSubmit = useCallback(
    ({ reason }: CancelLimitValues, formActions: FormikHelpers<CancelLimitValues>) => {
      dispatch(confirmCancelLimit(payload, reason, formActions));
    },
    [dispatch, payload]
  );

  const handleCloseDialog = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.CANCEL_LIMIT)), [dispatch]);

  const initialValues: CancelLimitValues = {
    reason: ""
  };

  return { handleSubmit, handleCloseDialog, initialValues, cancellationDays };
};

export { useCancelLimit };
