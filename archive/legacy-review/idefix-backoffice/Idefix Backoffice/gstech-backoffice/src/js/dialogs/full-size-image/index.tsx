import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Box from "@material-ui/core/Box";
import { closeDialog } from "../";

interface Props {
  payload: {
    source: any;
  };
  meta?: unknown;
}

const FullImageDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();

  const handleClose = useCallback(() => dispatch(closeDialog("full-size-image")), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} fullScreen={true}>
      <DialogTitle>Full size image</DialogTitle>
      <DialogContent>
        <Box display="flex" justifyContent="center" alignItems="center">
          {payload && <img src={payload.source} alt="fullDocument" />}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FullImageDialog;
