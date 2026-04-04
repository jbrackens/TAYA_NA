import { FormikHelpers } from "formik";
import { useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { AskForReasonFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { updateTestPlayer } from "./actions";

interface Payload {
  playerId: number;
  type: string;
  value: boolean;
}

const useTestPLayer = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const { playerId, type, value } = payload;

  const handleConfirm = useCallback(
    ({ reason }: AskForReasonFormValues, formActions: FormikHelpers<AskForReasonFormValues>) => {
      dispatch(updateTestPlayer({ playerId, type, value, reason, formActions }));
    },
    [dispatch, playerId, type, value]
  );

  const handleCloseDialog = useCallback(
    () => dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_TEST_PLAYER)),
    [dispatch]
  );

  const initialValues: AskForReasonFormValues = useMemo(() => ({ reason: "" }), []);

  return { handleConfirm, handleCloseDialog, initialValues };
};

export { useTestPLayer };
