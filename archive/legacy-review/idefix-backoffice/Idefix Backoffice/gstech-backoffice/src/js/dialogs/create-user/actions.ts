import api from "../../core/api";
import { refetchUsers } from "../../modules/users-sidebar";
import { closeDialog } from "../";
import browserHistory from "../../history";
import { FormValues } from "./index";
import { FormikHelpers } from "formik";
import { AppDispatch } from "../../../index";

export const createUser = (values: FormValues, actions: FormikHelpers<FormValues>) => async (dispatch: AppDispatch) => {
  try {
    const userDraft = {
      ...values,
      mobilePhone: values.mobilePhone ? values.mobilePhone.substring(1) : "",
    };

    const user = await api.users.create(userDraft);
    dispatch(refetchUsers());
    browserHistory.push(`/users/@${user.id}`);
    dispatch(closeDialog("create-user"));
  } catch (error) {
    if (error && error.constraint === "users_email_key") {
      return actions.setFieldError("general", "This email already exists");
    }

    if (error && error.constraint === "users_handle_key") {
      return actions.setFieldError("general", "This handle already exists");
    }

    if (error && error.constraint === "users_mobilePhone_key") {
      return actions.setFieldError("general", "This mobilePhone already exists");
    }

    actions.setFieldError("general", error.message);
  }
};
