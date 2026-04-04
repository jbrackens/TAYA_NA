import React, { FC } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Button from "@mui/material/Button";

import { CodeGenerationForm, CodeConfirmationForm, ResetPasswordForm } from "@idefix-backoffice/idefix/forms";

import { ResetConfirmation } from "./components/ResetConfirmation";
import { useResetPassword } from "./hooks";
import { getContentText, getTitle, steps } from "./utils";

interface Props {
  payload: unknown;
  meta?: unknown;
}

const ResetPasswordDialog: FC<Props> = () => {
  const {
    handleChangeValue,
    handleCancelDialog,
    handleResetPassword,
    handleConfirmCode,
    handleGenerateCode,
    step,
    setStep
  } = useResetPassword();

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
      </Button>
    ];

    const commonActions = [
      <Button key={3} color="primary" onClick={handleCancelDialog}>
        Cancel
      </Button>
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

export { ResetPasswordDialog };
