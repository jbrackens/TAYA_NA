import { FormikHelpers } from "formik";
import { useCallback } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { cancelPaymentTransaction } from "./actions";

interface Payload {
  playerId: number;
  withdrawalId: string;
}

const useConfirmCancelWd = (payload: Payload) => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    (_: unknown, formActions: FormikHelpers<Record<string, unknown>>) => {
      const { playerId, withdrawalId } = payload || {};
      dispatch(cancelPaymentTransaction({ playerId, transactionKey: withdrawalId, formActions }));
    },
    [dispatch, payload]
  );

  const handleCloseDialog = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_CANCEL_WD)), [dispatch]);

  return { handleSubmit, handleCloseDialog };
};

export { useConfirmCancelWd };
