import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { GamblingProblemData, DIALOG } from "@idefix-backoffice/idefix/types";

export const registerGamblingProblem =
  (data: GamblingProblemData, formikActions: FormikHelpers<GamblingProblemData["player"]>) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.createGamblingProblem(data);
      dispatch(dialogsSlice.closeDialog(DIALOG.REGISTER_GAMBLING_PROBLEM));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
      formikActions.setSubmitting(false);
    }
  };
