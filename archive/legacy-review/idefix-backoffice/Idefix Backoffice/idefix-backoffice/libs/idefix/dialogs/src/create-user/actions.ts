import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, usersSidebarSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { CreateUserFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const createUser =
  (values: CreateUserFormValues, actions: FormikHelpers<CreateUserFormValues>) => async (dispatch: AppDispatch) => {
    try {
      const userDraft = {
        ...values,
        mobilePhone: values.mobilePhone ? values.mobilePhone.substring(1) : ""
      };

      const user = await api.users.create(userDraft);
      dispatch(usersSidebarSlice.fetchUsers());
      dispatch(dialogsSlice.closeDialog(DIALOG.CREATE_USER));
      return user;
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
