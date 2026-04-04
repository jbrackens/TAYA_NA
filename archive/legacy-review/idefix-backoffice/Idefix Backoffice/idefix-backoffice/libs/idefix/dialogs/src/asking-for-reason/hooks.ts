import { FormikHelpers } from "formik";
import { useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { updateRiskProfile } from "./actions";

interface Payload {
  playerId: number;
  field: string;
  value: string;
}

const useAskingForReason = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const { playerId, field, value } = payload;

  const handleSubmit = useCallback(
    ({ reason }: { reason: string }, formActions: FormikHelpers<{ reason: string }>) => {
      dispatch(updateRiskProfile({ playerId, field, value, reason, formActions }));
    },
    [dispatch, field, playerId, value]
  );

  const handleCloseDialog = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.ASKING_FOR_REASON)), [dispatch]);

  const initialValues = useMemo(() => ({ reason: "" }), []);

  return { handleSubmit, handleCloseDialog, initialValues };
};

export { useAskingForReason };
