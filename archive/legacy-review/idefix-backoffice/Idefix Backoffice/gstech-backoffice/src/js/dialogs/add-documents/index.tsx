import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { AddDocumentsForm, validate } from "../../forms/add-documents";
import { closeDialog } from "../";
import { addDocuments } from "./actions";

export type FormValues = {
  type: string;
  content?: string;
  photos?: { id: string; originalName: string; isLoading?: boolean }[];
};

interface Props {
  payload: number;
  meta?: unknown;
}

const AddDocumentsDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();

  const handleSubmit = useCallback(
    (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      dispatch(addDocuments({ playerId: payload, values, formikActions }));
    },
    [dispatch, payload],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("add-documents")), [dispatch]);

  const initialValues: FormValues = useMemo(() => ({ type: "photos" }), []);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md">
      <Formik validate={validate} onSubmit={handleSubmit} initialValues={initialValues}>
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

export default AddDocumentsDialog;
