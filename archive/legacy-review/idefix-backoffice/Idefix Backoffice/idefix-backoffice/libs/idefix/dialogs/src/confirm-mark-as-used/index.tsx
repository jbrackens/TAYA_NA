import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { ConfirmMarkAsUsedForm } from "@idefix-backoffice/idefix/forms";
import { useMarkAsUsed } from "./hooks";

interface Props {
  payload: {
    playerId: number;
    groupId: string;
  };
  meta?: unknown;
}

const ConfirmMarkAsUsedDialog: FC<Props> = ({ payload }) => {
  const { handleMarkAsUsed, handleCloseDialog, initialValues } = useMarkAsUsed(payload);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleCloseDialog}>
      <Formik initialValues={initialValues} onSubmit={handleMarkAsUsed}>
        {props => (
          <>
            <DialogTitle>Confirmation</DialogTitle>
            <DialogContent>
              <ConfirmMarkAsUsedForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" onClick={props.submitForm} disabled={props.isSubmitting} color="primary">
                Mark as Used
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { ConfirmMarkAsUsedDialog };
