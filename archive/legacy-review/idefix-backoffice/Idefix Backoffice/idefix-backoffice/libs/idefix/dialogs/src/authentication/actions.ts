import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { Settings, DIALOG } from "@idefix-backoffice/idefix/types";
import { AppDispatch, appSlice, authenticationSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { AuthenticationFormValues } from "@idefix-backoffice/idefix/forms";

export const login =
  (credentials: AuthenticationFormValues, formActions: FormikHelpers<AuthenticationFormValues>) =>
  async (dispatch: AppDispatch) => {
    try {
      const { userId, token, settings } = await api.authentication.login(credentials);
      dispatch(authenticationSlice.loginSuccessful({ userId, token }));
      dispatch(appSlice.initializeSettingsSuccess(settings as Partial<Settings>));
      dispatch(dialogsSlice.closeDialog(DIALOG.AUTHENTICATION));
    } catch (error) {
      dispatch(authenticationSlice.loginError());
      formActions.setFieldError("general", error.message);
      formActions.setSubmitting(false);
      if (error && error.code === 468) {
        dispatch(dialogsSlice.openDialog(DIALOG.CHANGE_PASSWORD, credentials.email));
      }
    }
  };
