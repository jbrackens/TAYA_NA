import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, limitsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { LimitType, PeriodType, DIALOG } from "@idefix-backoffice/idefix/types";

export const setLimit =
  (
    playerId: number,
    type: LimitType,
    values: {
      period: PeriodType;
      reason: string;
      duration?: number | "indefinite" | undefined;
      limit?: number | undefined;
      isInternal?: boolean | undefined;
    },
    formikActions: FormikHelpers<any>
  ) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.setLimit(playerId, type, values);
      dispatch(limitsSlice.fetchActiveLimits(playerId));
      dispatch(limitsSlice.fetchHistory(playerId));
      dispatch(dialogsSlice.closeDialog(DIALOG.SET_LIMIT));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };
