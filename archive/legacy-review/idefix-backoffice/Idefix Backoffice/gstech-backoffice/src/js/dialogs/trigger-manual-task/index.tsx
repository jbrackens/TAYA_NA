import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik } from "formik";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import { triggerManualTask } from "./actions";
import { closeDialog } from "../";
import { TriggerManualTaskForm, validationSchema } from "../../forms/trigger-manual-task";

interface Props {
  payload: number;
  meta?: unknown;
}

const TriggerManualTaskDialog: FC<Props> = ({ payload: playerId }) => {
  const dispatch = useDispatch();

  const handleSubmit = useCallback(
    (values, formikActions) => {
      dispatch(triggerManualTask(playerId, values, formikActions));
    },
    [dispatch, playerId],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("trigger-manual-task")), [dispatch]);

  const initialValues = useMemo(
    () => ({
      fraudKey: "",
      checked: false,
    }),
    [],
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={validationSchema}>
        {props => (
          <>
            <DialogTitle>Trigger risk</DialogTitle>
            <DialogContent>
              <TriggerManualTaskForm />
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
                Create New
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default TriggerManualTaskDialog;
