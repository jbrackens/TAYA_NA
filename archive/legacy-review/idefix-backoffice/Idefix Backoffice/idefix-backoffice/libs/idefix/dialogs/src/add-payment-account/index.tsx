import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { PaymentAccountForm, paymentAccountValidationSchema } from "@idefix-backoffice/idefix/forms";
import { useAddPaymentAccount } from "./hooks";

interface Props {
  payload: number;
  meta?: unknown;
}

const AddPaymentAccountDialog: FC<Props> = ({ payload: playerId }) => {
  const { handleSubmit, handleCloseDialog, initialValues } = useAddPaymentAccount(playerId);

  return (
    <Dialog open={true} maxWidth="md" transitionDuration={0} onClose={handleCloseDialog}>
      <Formik
        onSubmit={handleSubmit}
        initialValues={initialValues}
        enableReinitialize={true}
        validate={paymentAccountValidationSchema}
      >
        {props => (
          <>
            <DialogTitle>Payment Account</DialogTitle>
            <DialogContent>
              <PaymentAccountForm formikProps={props} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="primary">
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
                color="primary"
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

export { AddPaymentAccountDialog };
