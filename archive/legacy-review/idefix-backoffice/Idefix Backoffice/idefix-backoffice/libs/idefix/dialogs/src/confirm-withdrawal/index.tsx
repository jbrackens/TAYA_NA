import React, { FC } from "react";
import { Formik } from "formik";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

import { ConfirmWithdrawalForm, confirmWdValidationSchema } from "@idefix-backoffice/idefix/forms";
import { useConfirmWd } from "./hooks";

interface Props {
  payload: {
    playerId: string;
    withdrawalId: string;
  };
  meta?: unknown;
}

const ConfirmWithdrawalDialog: FC<Props> = ({ payload }) => {
  const { handleSubmit, handleCloseDialog, initialValues } = useConfirmWd(payload);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={confirmWdValidationSchema}>
        {props => (
          <>
            <DialogTitle>Confirm stuck withdrawal</DialogTitle>
            <DialogContent style={{ width: "400px" }}>
              <ConfirmWithdrawalForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={props.submitForm}
                disabled={props.isSubmitting || !props.dirty || !props.isValid}
                color="primary"
              >
                Confirm
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { ConfirmWithdrawalDialog };
