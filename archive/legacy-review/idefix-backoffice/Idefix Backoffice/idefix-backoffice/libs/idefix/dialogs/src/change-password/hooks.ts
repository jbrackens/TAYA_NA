import { useCallback } from "react";
import { FormikHelpers } from "formik";
import pick from "lodash/fp/pick";

import { useAppDispatch } from "@idefix-backoffice/idefix/store";
import { ChangePasswordValues } from "@idefix-backoffice/idefix/types";

import { change } from "./actions";

const useChangePassword = (email: string) => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    (values: ChangePasswordValues, formActions: FormikHelpers<ChangePasswordValues>) => {
      dispatch(change(email, pick(["oldPassword", "newPassword", "confirmPassword"], values), formActions));
    },
    [dispatch, email]
  );

  const initialValues = {
    email: "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  };

  return { handleSubmit, initialValues };
};

export { useChangePassword };
