import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import { closeDialog } from "../";

interface Props {
  payload: {
    message?: string;
  };
  meta?: unknown;
}

const NetworkFailureDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();

  const handleClose = useCallback(() => dispatch(closeDialog("network-failure")), [dispatch]);

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

export default NetworkFailureDialog;
