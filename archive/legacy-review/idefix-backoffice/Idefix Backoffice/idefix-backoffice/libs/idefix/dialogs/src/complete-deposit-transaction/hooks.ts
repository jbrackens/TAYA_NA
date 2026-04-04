import { useCallback, useMemo } from "react";
import { FormikHelpers } from "formik";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { CompleteDepTransactFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { completeDepositTransaction } from "./actions";

interface Payload {
  playerId: number;
  transactionId: string;
  transactionKey: string;
}

const useCompleteDepositTransaction = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const initialTransactionId = payload && payload.transactionId ? payload.transactionId : "";

  const handleSubmit = useCallback(
    (
      { reason, transactionId }: CompleteDepTransactFormValues,
      formActions: FormikHelpers<CompleteDepTransactFormValues>
    ) => {
      dispatch(
        completeDepositTransaction({
          playerId: payload.playerId,
          transactionKey: payload.transactionKey,
          transactionId,
          reason,
          formActions
        })
      );
    },
    [dispatch, payload]
  );

  const handleCloseDialog = useCallback(
    () => dispatch(dialogsSlice.closeDialog(DIALOG.COMPLETE_DEPOSIT_TRANSACTION)),
    [dispatch]
  );

  const initialValues: CompleteDepTransactFormValues = useMemo(
    () => ({
      transactionId: initialTransactionId,
      reason: ""
    }),
    [initialTransactionId]
  );

  return { handleSubmit, handleCloseDialog, initialValues, initialTransactionId };
};

export { useCompleteDepositTransaction };
