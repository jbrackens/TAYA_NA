import { FormikHelpers } from "formik";
import { useCallback } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { MarkAsUsedFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { confirmMarkAsUsed } from "./actions";

interface Payload {
  playerId: number;
  groupId: string;
}

const useMarkAsUsed = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const { playerId, groupId } = payload;

  const handleMarkAsUsed = useCallback(
    (values: MarkAsUsedFormValues, formikActions: FormikHelpers<MarkAsUsedFormValues>) => {
      dispatch(confirmMarkAsUsed({ playerId, groupId: Number(groupId), values, formikActions }));
    },
    [dispatch, groupId, playerId]
  );

  const handleCloseDialog = useCallback(
    () => dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_MARK_AS_USED)),
    [dispatch]
  );

  const initialValues = { comment: "" };

  return { handleMarkAsUsed, handleCloseDialog, initialValues };
};

export { useMarkAsUsed };
