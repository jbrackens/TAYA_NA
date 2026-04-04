import { ChangePasswordRequest, ChangePasswordValues } from "app/types";
import api from "../../core/api";
import { closeDialog } from "../";
import { authenticationRequired } from "../../modules/authentication";
import { FormikHelpers } from "formik";
import { AppDispatch } from "../../../index";

export const change =
  (email: string, newPasswordDraft: ChangePasswordRequest, formActions: FormikHelpers<ChangePasswordValues>) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.users.changePassword(email, newPasswordDraft);
      dispatch(closeDialog("change-password"));
      dispatch(authenticationRequired());
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
