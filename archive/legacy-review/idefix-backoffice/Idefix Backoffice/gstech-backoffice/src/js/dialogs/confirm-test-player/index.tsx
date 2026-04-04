import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { AskingForReasonForm, validationSchema } from "../../forms/asking-for-reason";
import { closeDialog } from "../";
import { updateTestPlayer } from "./actions";

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

const ConfirmTestPlayerDialog: FC<Props> = ({ payload: { playerId, type, value } }) => {
  const dispatch = useDispatch();

  const handleConfirm = useCallback(
    ({ reason }: FormValues, formActions: FormikHelpers<FormValues>) => {
      dispatch(updateTestPlayer({ playerId, type, value, reason, formActions }));
    },
    [dispatch, playerId, type, value],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("confirm-test-player")), [dispatch]);

  const initialValues: FormValues = useMemo(() => ({ reason: "" }), []);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik initialValues={initialValues} onSubmit={handleConfirm} validationSchema={validationSchema}>
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

export default ConfirmTestPlayerDialog;
