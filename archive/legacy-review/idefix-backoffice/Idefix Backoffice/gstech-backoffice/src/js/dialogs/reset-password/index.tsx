import React, { FC, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import Button from "@material-ui/core/Button";
import { closeDialog } from "../";
import ResetConfirmation from "./components/ResetConfirmation";
import { CodeGenerationForm } from "../../forms/code-generation";
import { CodeConfirmationForm } from "../../forms/code-confirmation";
import { ResetPasswordForm } from "../../forms/reset-password";
import api from "../../core/api";
import { authenticationRequired, changeValue } from "../../modules/authentication";
import { RootState } from "js/rootReducer";

const steps = {
  RESET_CONFIRMATION: "reset-confirmation",
  CODE_GENERATION: "code-generation",
  CODE_CONFIRMATION: "code-confirmation",
  RESET_PASSWORD: "reset-password",
};

const getTitle = (step: string) => {
  switch (step) {
    case steps.RESET_CONFIRMATION:
      return "Reset Confirmation";
    case steps.CODE_GENERATION:
      return "Code Generation";
    case steps.CODE_CONFIRMATION:
      return "Code Confirmation";
    case steps.RESET_PASSWORD:
      return "Reset Password";
    default:
      return "No content";
  }
};

const getContentText = (step: string) => {
  switch (step) {
    case steps.RESET_CONFIRMATION:
      return "Do you want to reset password?";
    case steps.CODE_GENERATION:
      return "Please enter your email address...";
    case steps.CODE_CONFIRMATION:
      return "We've sent an SMS with a verification code to your phone. Please enter the 6-digit verification code below";
    default:
      return "No content";
  }
};

interface Props {
  payload: unknown;
  meta?: unknown;
}

const ResetPasswordDialog: FC<Props> = () => {
  const dispatch = useDispatch();

  const [step, setStep] = useState(steps.RESET_CONFIRMATION);
  const { email, code } = useSelector((state: RootState) => state.authentication.values);

  const handleCancelDialog = useCallback(() => {
    setStep(steps.RESET_CONFIRMATION);
    dispatch(closeDialog("reset-password"));
    dispatch(authenticationRequired());
  }, [dispatch]);

  const handleChangeValue = useCallback((key, value) => dispatch(changeValue({ key, value })), [dispatch]);

  const handleGenerateCode = useCallback(async ({ email }, formikActions) => {
    try {
      await api.users.generateCode(email);
      setStep(steps.CODE_CONFIRMATION);
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  }, []);

  const handleConfirmCode = useCallback(
    async ({ code }, formikActions) => {
      try {
        await api.users.confirmCode({ code, email });
        setStep(steps.RESET_PASSWORD);
      } catch (error) {
        formikActions.setFieldError("general", error.message);
      }
    },
    [email],
  );

  const handleResetPassword = useCallback(
    async ({ newPassword, confirmPassword }, formikActions) => {
      try {
        await api.users.resetPassword({ email, code: Number(code), newPassword, confirmPassword });
        setStep(steps.RESET_CONFIRMATION);
        dispatch(authenticationRequired());
      } catch (error) {
        formikActions.setFieldError("general", error.message);
      }
    },
    [code, dispatch, email],
  );

  const getStepContent = (step: string) => {
    switch (step) {
      case steps.RESET_CONFIRMATION:
        return <ResetConfirmation text={getContentText(step)} />;
      case steps.CODE_GENERATION:
        return (
          <CodeGenerationForm
            text={getContentText(step)}
            onSubmit={handleGenerateCode}
            onChangeValue={handleChangeValue}
          />
        );
      case steps.CODE_CONFIRMATION:
        return (
          <CodeConfirmationForm
            text={getContentText(step)}
            onSubmit={handleConfirmCode}
            onChangeValue={handleChangeValue}
            onCloseDialog={handleCancelDialog}
          />
        );
      case steps.RESET_PASSWORD:
        return <ResetPasswordForm onSubmit={handleResetPassword} />;
      default:
        return "No Content";
    }
  };

  const getActions = (step: string) => {
    const resetConfirmationActions = [
      <Button key={1} color="primary" onClick={handleCancelDialog}>
        No
      </Button>,
      <Button key={2} color="primary" onClick={() => setStep(steps.CODE_GENERATION)}>
        Yes
      </Button>,
    ];

    const commonActions = [
      <Button key={3} color="primary" onClick={handleCancelDialog}>
        Cancel
      </Button>,
    ];

    switch (step) {
      case steps.RESET_CONFIRMATION:
        return resetConfirmationActions;
      case steps.CODE_GENERATION:
      case steps.CODE_CONFIRMATION:
      case steps.RESET_PASSWORD:
      default:
        return commonActions;
    }
  };

  return (
    <Dialog open={true} transitionDuration={0}>
      <DialogTitle>{getTitle(step)}</DialogTitle>
      <DialogContent>{getStepContent(step)}</DialogContent>
      <DialogActions>{getActions(step)}</DialogActions>
    </Dialog>
  );
};

export default ResetPasswordDialog;
