import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { closeDialog } from "../";

interface Props {
  payload: {
    message?: string;
  };
  meta?: unknown;
}

const BadRequestDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();

  const handleClose = useCallback(() => dispatch(closeDialog("bad-request")), [dispatch]);

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

export default BadRequestDialog;
