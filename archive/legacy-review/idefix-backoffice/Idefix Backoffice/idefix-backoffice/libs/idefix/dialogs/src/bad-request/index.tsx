import React, { FC, useCallback } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  payload: {
    message?: string;
  };
  meta?: unknown;
}

const BadRequestDialog: FC<Props> = ({ payload }) => {
  const dispatch = useAppDispatch();

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.BAD_REQUEST)), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <DialogTitle>Bad Request</DialogTitle>
      <DialogContent>{payload?.message || "Try to change your request"}</DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleClose}>
          Ok
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { BadRequestDialog };
