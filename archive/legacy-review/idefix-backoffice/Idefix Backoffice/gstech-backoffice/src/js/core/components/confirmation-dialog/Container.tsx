import React, { FC, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";
import { closeConfirmationDialog, getState } from "./confirmationSlice";

const ConfirmationDialog: FC = () => {
  const dispatch = useDispatch();
  const { open, payload } = useSelector(getState);

  const handleSubmit = useCallback(() => {
    if (payload) {
      const { callback } = payload;
      callback();
      dispatch(closeConfirmationDialog());
    }
  }, [dispatch, payload]);

  const handleCloseDialog = useCallback(() => dispatch(closeConfirmationDialog()), [dispatch]);

  return (
    <Dialog open={open} transitionDuration={0} onClose={handleCloseDialog}>
      <DialogTitle>Confirmation</DialogTitle>
      <DialogContent>
        <DialogContentText>{payload?.message || "Are you sure?"}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleCloseDialog}>
          No
        </Button>
        <Button color="primary" onClick={handleSubmit}>
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
