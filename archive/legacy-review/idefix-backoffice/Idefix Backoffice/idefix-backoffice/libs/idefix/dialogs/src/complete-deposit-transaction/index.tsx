import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";

import {
  CompleteDepositTransactionForm,
  completeDepTransactionValidationSchema
} from "@idefix-backoffice/idefix/forms";

import { useCompleteDepositTransaction } from "./hooks";

interface Props {
  payload: {
    playerId: number;
    transactionId: string;
    transactionKey: string;
  };
  meta?: unknown;
}

const CompleteDepositTransactionDialog: FC<Props> = ({ payload }) => {
  const { handleSubmit, handleCloseDialog, initialValues, initialTransactionId } =
    useCompleteDepositTransaction(payload);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleCloseDialog}>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={completeDepTransactionValidationSchema}
      >
        {props => (
          <>
            <DialogTitle>Complete Deposit Transaction</DialogTitle>
            <DialogContent>
              <Box minWidth={400} minHeight={200}>
                <CompleteDepositTransactionForm disableTransactionIdField={!!initialTransactionId} />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                color="primary"
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
              >
                Complete
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { CompleteDepositTransactionDialog };
