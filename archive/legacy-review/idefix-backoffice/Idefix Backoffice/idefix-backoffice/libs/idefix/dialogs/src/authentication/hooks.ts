import { FormikHelpers } from "formik";
import { useCallback, useMemo } from "react";

import { useAppDispatch, useAppSelector, authenticationSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { AuthenticationFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { login } from "./actions";

const useAuthentication = () => {
  const dispatch = useAppDispatch();
  const invalidLoginDetails = useAppSelector(authenticationSlice.getIsInvalidLoginCredentials);

  const handleLogin = useCallback(
    (values: AuthenticationFormValues, formikActions: FormikHelpers<AuthenticationFormValues>) => {
      dispatch(login(values, formikActions));
    },
    [dispatch]
  );
  const handleOpenDialog = useCallback(() => dispatch(dialogsSlice.openDialog(DIALOG.RESET_PASSWORD, {})), [dispatch]);

  const initialValues: AuthenticationFormValues = useMemo(
    () => ({
      email: "",
      password: ""
    }),
    []
  );

  return { handleLogin, handleOpenDialog, initialValues, invalidLoginDetails };
};

export { useAuthentication };
