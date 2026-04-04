import React, { FC } from "react";
import { Formik } from "formik";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

import { AcceptWithdrawalForm } from "@idefix-backoffice/idefix/forms";

import { useAcceptWithdrawal } from "./hooks";

interface Props {
  payload: {
    playerId: string;
    withdrawalId: string;
    paymentProviderId: number | null;
    amount: number;
  };
  meta?: unknown;
}

const AcceptWithdrawalDialog: FC<Props> = ({ payload }) => {
  const { handleSubmit, handleCloseDialog } = useAcceptWithdrawal(payload);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik initialValues={{}} onSubmit={handleSubmit}>
        {props => (
          <>
            <DialogTitle>Accept now</DialogTitle>
            <DialogContent>
              <AcceptWithdrawalForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" onClick={props.submitForm} disabled={props.isSubmitting} color="primary">
                Accept
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { AcceptWithdrawalDialog };
