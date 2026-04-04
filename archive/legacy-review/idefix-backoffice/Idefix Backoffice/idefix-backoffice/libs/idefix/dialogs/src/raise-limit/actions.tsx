import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, limitsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { PeriodType, DIALOG } from "@idefix-backoffice/idefix/types";

export const raiseLimit =
  (
    playerId: number,
    limitId: number,
    values: {
      reason: string;
      period: PeriodType;
      limit: number;
    },
    formikActions: FormikHelpers<any>
  ) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.raiseLimit(playerId, limitId, values);
      dispatch(limitsSlice.fetchActiveLimits(playerId));
      dispatch(limitsSlice.fetchHistory(playerId));
      dispatch(dialogsSlice.closeDialog(DIALOG.RAISE_LIMIT));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };
