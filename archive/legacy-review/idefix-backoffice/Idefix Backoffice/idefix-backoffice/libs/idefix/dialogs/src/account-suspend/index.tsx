import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { useAppSelector, appSlice } from "@idefix-backoffice/idefix/store";
import { AccountSuspendForm } from "@idefix-backoffice/idefix/forms";

import { useAccountSuspend } from "./hooks";

interface Props {
  payload: {
    playerId: number;
    value: boolean;
  };
  meta?: unknown;
}

const AccountSuspendDialog: FC<Props> = ({ payload }) => {
  const userRoles = useAppSelector(appSlice.getRoles);
  const { handleSubmit, handleCloseDialog, initialValues } = useAccountSuspend(payload);
  const isRiskManagerRole = userRoles?.includes("riskManager");

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik initialValues={initialValues} onSubmit={handleSubmit}>
        {props => (
          <>
            <DialogTitle>Close account</DialogTitle>
            <DialogContent>
              <AccountSuspendForm isRiskManagerRole={isRiskManagerRole} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="primary">
                Cancel
              </Button>
              <Button type="submit" onClick={props.submitForm} disabled={props.isSubmitting} color="primary">
                Proceed
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { AccountSuspendDialog };
