import { FormikHelpers } from "formik";

import { ChangePasswordRequest, ChangePasswordValues, DIALOG } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, authenticationSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";

export const change =
  (email: string, newPasswordDraft: ChangePasswordRequest, formActions: FormikHelpers<ChangePasswordValues>) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.users.changePassword(email, newPasswordDraft);
      dispatch(dialogsSlice.closeDialog(DIALOG.CHANGE_PASSWORD));
      dispatch(authenticationSlice.authenticationRequired());
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
