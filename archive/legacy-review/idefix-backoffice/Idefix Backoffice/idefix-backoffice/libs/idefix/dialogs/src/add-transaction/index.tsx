import React from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { PlayerPaymentAccounts } from "@idefix-backoffice/idefix/types";
import { AddTransactionForm, addTransactionValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useAddTransaction } from "./hooks";

interface Props {
  payload: number;
  meta: PlayerPaymentAccounts;
}

const AddTransactionDialog = ({ payload: playerId, meta }: Props) => {
  const { handleSubmit, handleCloseDialog, initialValues, withdrawals } = useAddTransaction(playerId);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik onSubmit={handleSubmit} initialValues={initialValues} validate={addTransactionValidationSchema}>
        {props => (
          <>
            <DialogTitle>Add transaction</DialogTitle>
            <DialogContent>
              {meta && <AddTransactionForm {...props} accounts={meta} withdrawals={withdrawals} />}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="primary">
                Cancel
              </Button>
              <Button
                onClick={props.submitForm}
                type="submit"
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

export { AddTransactionDialog };
