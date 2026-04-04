import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { useAppSelector } from "@idefix-backoffice/idefix/store";
import { Kyc } from "@idefix-backoffice/idefix/types";
import { ViewPlayerDocumentForm, viewPlayerDocValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useViewPlayerDocument } from "./hooks";

interface Props {
  payload: { playerId: number; document: Kyc };
  meta?: unknown;
}

const ViewPlayerDocumentDialog: FC<Props> = ({ payload }) => {
  const { handleSubmit, handleClose, initialValues } = useViewPlayerDocument(payload);
  const accounts = useAppSelector(state => state.payments.accounts);

  return (
    <Dialog open={true} maxWidth="md" onClose={handleClose} transitionDuration={0}>
      <Formik onSubmit={handleSubmit} validationSchema={viewPlayerDocValidationSchema} initialValues={initialValues}>
        {props => (
          <>
            <DialogTitle>Document</DialogTitle>
            <DialogContent>
              <ViewPlayerDocumentForm accounts={accounts} formikProps={props} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
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

export { ViewPlayerDocumentDialog };
