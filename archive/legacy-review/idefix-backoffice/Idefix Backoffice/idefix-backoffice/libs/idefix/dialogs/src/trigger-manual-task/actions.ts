import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const triggerManualTask =
  (
    playerId: number,
    values: {
      fraudKey: string;
      fraudId: string;
      note: string;
      checked: boolean;
    },
    formikActions: FormikHelpers<any>
  ) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.addManualTask(playerId, values);
      dispatch(dialogsSlice.closeDialog(DIALOG.TRIGGER_MANUAL_TASK));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
      formikActions.setSubmitting(false);
    }
  };
