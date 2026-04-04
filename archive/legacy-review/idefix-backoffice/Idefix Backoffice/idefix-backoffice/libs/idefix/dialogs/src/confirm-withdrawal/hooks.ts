import { FormikHelpers } from "formik";
import { useCallback } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { ConfirmWdFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { confirm } from "./actions";

interface Payload {
  playerId: string;
  withdrawalId: string;
}

const useConfirmWd = (payload: Payload) => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    ({ externalTransactionId }: ConfirmWdFormValues, formActions: FormikHelpers<ConfirmWdFormValues>) => {
      const { playerId, withdrawalId } = payload;
      dispatch(
        confirm({
          playerId: Number(playerId),
          withdrawalId,
          externalTransactionId
        })
      );
    },
    [dispatch, payload]
  );

  const handleCloseDialog = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_WD)), [dispatch]);

  const initialValues = { externalTransactionId: "" };

  return { handleSubmit, handleCloseDialog, initialValues };
};

export { useConfirmWd };
