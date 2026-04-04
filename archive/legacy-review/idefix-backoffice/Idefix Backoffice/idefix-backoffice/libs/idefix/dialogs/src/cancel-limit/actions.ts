import { FormikHelpers } from "formik";

import { ActiveLimit, CancelLimitValues, DIALOG } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, limitsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";

interface Payload {
  limit: ActiveLimit;
  delay: boolean;
  playerId: number;
}

export const confirmCancelLimit =
  (payload: Payload, reason: string, formActions: FormikHelpers<CancelLimitValues>) =>
  async (dispatch: AppDispatch) => {
    const { limit, delay, playerId } = payload;
    try {
      await api.players.cancelLimit(limit, delay, reason);
      dispatch(limitsSlice.fetchActiveLimits(playerId));
      dispatch(limitsSlice.fetchHistory(playerId));
      dispatch(dialogsSlice.closeDialog(DIALOG.CANCEL_LIMIT));
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
