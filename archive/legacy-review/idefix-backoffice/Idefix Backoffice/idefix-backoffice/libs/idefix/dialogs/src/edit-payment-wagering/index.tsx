import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { PlayerPayment } from "@idefix-backoffice/idefix/types";
import { EditPaymentWageringForm, editPaymentWageringValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useEditPaymentWagering } from "./hooks";

interface Props {
  payload: {
    playerId: number;
    payment: PlayerPayment;
  };
  meta?: unknown;
}

const EditPaymentWageringDialog: FC<Props> = ({ payload }) => {
  const { handleSubmit, handleClose, initialValues } = useEditPaymentWagering(payload);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik
        onSubmit={handleSubmit}
        initialValues={initialValues}
        validationSchema={editPaymentWageringValidationSchema}
      >
        {props => (
          <>
            <DialogTitle>Edit deposit wagering requirement</DialogTitle>
            <DialogContent>
              <EditPaymentWageringForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
              >
                Save
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { EditPaymentWageringDialog };
