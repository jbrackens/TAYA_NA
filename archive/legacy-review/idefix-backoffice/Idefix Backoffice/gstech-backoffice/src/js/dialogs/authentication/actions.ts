import api from "../../core/api";
import { Settings } from "app/types";
import { FormikHelpers } from "formik";
import { loginSuccessful, loginError } from "../../modules/authentication";
import { initializeSettingsSuccess } from "../../modules/app";
import { openDialog, closeDialog } from "../";
import { FormValues } from "./";
import { AppDispatch } from "../../../index";

export const login = (credentials: FormValues, formActions: FormikHelpers<FormValues>) => async (
  dispatch: AppDispatch,
) => {
  try {
    const { userId, token, settings } = await api.authentication.login(credentials);
    dispatch(loginSuccessful({ userId, token }));
    dispatch(initializeSettingsSuccess(settings as Partial<Settings>));
    dispatch(closeDialog("authentication"));
  } catch (error) {
    dispatch(loginError());
    formActions.setFieldError("general", error.message);
    formActions.setSubmitting(false);
    if (error && error.code === 468) {
      dispatch(openDialog("change-password", credentials.email));
    }
  }
};
