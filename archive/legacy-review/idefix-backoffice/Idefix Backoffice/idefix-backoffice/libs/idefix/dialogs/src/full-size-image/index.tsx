import React, { FC, useCallback } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  payload: {
    source: string;
  };
  meta?: unknown;
}

const FullImageDialog: FC<Props> = ({ payload }) => {
  const dispatch = useAppDispatch();

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.FULL_SIZE_IMAGE)), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} fullScreen={true}>
      <DialogTitle>Full size image</DialogTitle>
      <DialogContent>
        <Box border="1px solid #ccc" overflow="auto">
          {payload?.source && <img src={payload.source} alt="fullDocument" />}
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

export { FullImageDialog };
