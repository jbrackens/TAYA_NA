import { useCallback } from "react";
import { FormikHelpers } from "formik";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { accept } from "./actions";

interface Payload {
  playerId: string;
  withdrawalId: string;
  paymentProviderId: number | null;
  amount: number;
}

const useAcceptWdWithDelay = (payload: Payload) => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    (_: Record<string, unknown>, formActions: FormikHelpers<Record<string, unknown>>) => {
      const { playerId, withdrawalId, paymentProviderId, amount } = payload || {};

      if (paymentProviderId != null) {
        dispatch(
          accept({
            playerId: Number(playerId),
            withdrawalId,
            paymentProviderId,
            amount,
            formActions
          })
        );
      }
    },
    [dispatch, payload]
  );

  const handleCloseDialog = useCallback(
    () => dispatch(dialogsSlice.closeDialog(DIALOG.ACCEPT_WD_WITH_DELAY)),
    [dispatch]
  );

  return { handleSubmit, handleCloseDialog };
};

export { useAcceptWdWithDelay };
