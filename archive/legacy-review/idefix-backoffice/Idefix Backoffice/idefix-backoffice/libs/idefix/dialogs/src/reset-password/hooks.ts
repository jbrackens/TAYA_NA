import { FormikHelpers } from "formik";
import { useState, useCallback } from "react";

import api from "@idefix-backoffice/idefix/api";
import { useAppDispatch, useAppSelector, dialogsSlice, authenticationSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { steps } from "./utils";

const useResetPassword = () => {
  const dispatch = useAppDispatch();

  const [step, setStep] = useState(steps.RESET_CONFIRMATION);
  const { email, code } = useAppSelector(state => state.authentication.values);

  const handleCancelDialog = useCallback(() => {
    setStep(steps.RESET_CONFIRMATION);
    dispatch(dialogsSlice.closeDialog(DIALOG.RESET_PASSWORD));
    dispatch(authenticationSlice.authenticationRequired());
  }, [dispatch]);

  const handleChangeValue = useCallback(
    (key: string, value: string) => dispatch(authenticationSlice.changeValue({ key, value })),
    [dispatch]
  );

  const handleGenerateCode = useCallback(
    async ({ email }: { email: string }, formikActions: FormikHelpers<{ email: string }>) => {
      try {
        await api.users.generateCode(email);
        setStep(steps.CODE_CONFIRMATION);
      } catch (error) {
        formikActions.setFieldError("general", error.message);
      }
    },
    []
  );

  const handleConfirmCode = useCallback(
    async ({ code }: { code: string | number }, formikActions: FormikHelpers<{ code: string | number }>) => {
      try {
        await api.users.confirmCode({ code: Number(code), email });
        setStep(steps.RESET_PASSWORD);
      } catch (error) {
        formikActions.setFieldError("general", error.message);
      }
    },
    [email]
  );

  const handleResetPassword = useCallback(
    async (
      { newPassword, confirmPassword }: { newPassword: string; confirmPassword: string },
      formikActions: FormikHelpers<{ newPassword: string; confirmPassword: string }>
    ) => {
      try {
        await api.users.resetPassword({ email, code: Number(code), newPassword, confirmPassword });
        setStep(steps.RESET_CONFIRMATION);
        dispatch(authenticationSlice.authenticationRequired());
      } catch (error) {
        formikActions.setFieldError("general", error.message);
      }
    },
    [code, dispatch, email]
  );

  return {
    handleChangeValue,
    handleCancelDialog,
    handleResetPassword,
    handleConfirmCode,
    handleGenerateCode,
    step,
    setStep
  };
};

export { useResetPassword };
