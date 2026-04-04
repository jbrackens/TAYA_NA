import React, { FC } from "react";
import { Formik } from "formik";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

import { ConfirmCancelWithdrawalForm } from "@idefix-backoffice/idefix/forms";
import { useConfirmCancelWd } from "./hooks";

interface Props {
  payload: {
    playerId: number;
    withdrawalId: string;
  };
  meta?: unknown;
}

const ConfirmCancelWithdrawalDialog: FC<Props> = ({ payload }) => {
  const { handleSubmit, handleCloseDialog } = useConfirmCancelWd(payload);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik initialValues={{}} onSubmit={handleSubmit}>
        {props => (
          <>
            <DialogTitle>Confirm</DialogTitle>
            <DialogContent>
              <ConfirmCancelWithdrawalForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" onClick={props.submitForm} disabled={props.isSubmitting} color="primary">
                Confirm
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { ConfirmCancelWithdrawalDialog };
