import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { AskingForReasonForm, askingForReasonValidationSchema } from "@idefix-backoffice/idefix/forms";
import { useTestPLayer } from "./hooks";

export interface FormValues {
  reason: string;
}

interface Props {
  payload: {
    playerId: number;
    type: string;
    value: boolean;
  };
  meta?: unknown;
}

const ConfirmTestPlayerDialog: FC<Props> = ({ payload }) => {
  const { handleConfirm, handleCloseDialog, initialValues } = useTestPLayer(payload);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik initialValues={initialValues} onSubmit={handleConfirm} validationSchema={askingForReasonValidationSchema}>
        {props => (
          <>
            <DialogTitle>Reason</DialogTitle>
            <DialogContent>
              <Box minWidth={400}>
                <AskingForReasonForm />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                color="primary"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
              >
                Accept
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { ConfirmTestPlayerDialog };
