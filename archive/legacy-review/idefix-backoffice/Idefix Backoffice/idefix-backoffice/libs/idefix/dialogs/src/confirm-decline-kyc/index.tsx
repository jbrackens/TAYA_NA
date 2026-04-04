import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { ConfirmDeclineKycForm } from "@idefix-backoffice/idefix/forms";

import { useDeclineKyc } from "./hooks";

interface Props {
  payload: {
    playerId: number;
    documentId: number;
  };
  meta?: unknown;
}

const ConfirmDeclineKycDialog: FC<Props> = ({ payload }) => {
  const { handleDecline, handleCloseDialog } = useDeclineKyc(payload);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleCloseDialog}>
      <Formik initialValues={{}} onSubmit={handleDecline}>
        {props => (
          <>
            <DialogTitle>Confirmation</DialogTitle>
            <DialogContent>
              <ConfirmDeclineKycForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" color="primary" onClick={props.submitForm}>
                Confirm
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { ConfirmDeclineKycDialog };
