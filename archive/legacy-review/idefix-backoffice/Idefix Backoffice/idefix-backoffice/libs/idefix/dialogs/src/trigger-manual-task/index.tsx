import React, { FC } from "react";
import { Formik } from "formik";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

import { TriggerManualTaskForm, triggerTaskValidationSchema } from "@idefix-backoffice/idefix/forms";
import { useTriggerManualTask } from "./hooks";

interface Props {
  payload: number;
  meta?: unknown;
}

const TriggerManualTaskDialog: FC<Props> = ({ payload: playerId }) => {
  const { handleSubmit, handleClose, initialValues, risks } = useTriggerManualTask(playerId);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={triggerTaskValidationSchema}>
        {props => (
          <>
            <DialogTitle>Trigger risk</DialogTitle>
            <DialogContent>
              <TriggerManualTaskForm risks={risks} />
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

export { TriggerManualTaskDialog };
