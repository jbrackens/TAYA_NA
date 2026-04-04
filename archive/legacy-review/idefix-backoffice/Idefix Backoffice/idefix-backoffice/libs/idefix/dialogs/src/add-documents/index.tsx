import React, { FC } from "react";
import { Formik } from "formik";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { AddDocumentsForm, addDocumentsValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useAddDocuments } from "./hooks";

interface Props {
  payload: number;
  meta?: unknown;
}

const AddDocumentsDialog: FC<Props> = ({ payload }) => {
  const { handleSubmit, handleCloseDialog, initialValues } = useAddDocuments(payload);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik validate={addDocumentsValidationSchema} onSubmit={handleSubmit} initialValues={initialValues}>
        {props => (
          <>
            <DialogTitle>Add documents</DialogTitle>
            <DialogContent>
              <Box minWidth={400}>
                <AddDocumentsForm formikProps={props} />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
                color="primary"
              >
                Add documents
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { AddDocumentsDialog };
