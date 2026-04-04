import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { PlayerPaymentAccounts } from "@idefix-backoffice/idefix/types";
import { RequestDocumentsForm, requestDocumentsValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useRequestDocuments } from "./hooks";

interface Props {
  payload: number;
  meta: PlayerPaymentAccounts | null;
}

const RequestDocumentsDialog: FC<Props> = ({ payload: playerId, meta }) => {
  const { handleSubmit, handleCloseDialog, initialValues } = useRequestDocuments(playerId);
  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik onSubmit={handleSubmit} validationSchema={requestDocumentsValidationSchema} initialValues={initialValues}>
        {props => (
          <>
            <DialogTitle>Request documents</DialogTitle>
            <DialogContent>
              <RequestDocumentsForm accounts={meta?.accounts} values={props.values} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="primary">
                Cancel
              </Button>
              <Button
                onClick={props.submitForm}
                type="submit"
                disabled={!props.isValid || props.isSubmitting}
                color="primary"
              >
                Send Request
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { RequestDocumentsDialog };
