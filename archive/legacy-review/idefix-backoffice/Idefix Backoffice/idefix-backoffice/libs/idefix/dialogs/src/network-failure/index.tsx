import React, { FC, useCallback } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  payload: {
    message?: string;
  };
  meta?: unknown;
}

const NetworkFailureDialog: FC<Props> = ({ payload }) => {
  const dispatch = useAppDispatch();

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.NETWORK_FAILURE)), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <DialogTitle>{(payload && payload?.message) || "Network error"}</DialogTitle>
      <DialogActions>
        <Button color="primary" onClick={handleClose}>
          Ok
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { NetworkFailureDialog };
