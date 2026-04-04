import { FormikHelpers } from "formik";
import { useCallback } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { declineKyc } from "./actions";

interface Payload {
  playerId: number;
  documentId: number;
}

const useDeclineKyc = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const { playerId, documentId } = payload;

  const handleDecline = useCallback(
    (_: unknown, formikHelpers: FormikHelpers<Record<string, unknown>>) => {
      dispatch(declineKyc(playerId, documentId, formikHelpers));
    },
    [dispatch, documentId, playerId]
  );

  const handleCloseDialog = useCallback(
    () => dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_DECLINE_KYC)),
    [dispatch]
  );

  return { handleDecline, handleCloseDialog };
};

export { useDeclineKyc };
