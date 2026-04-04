import React, { FC, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { overrideDocumentPhoto } from "./actions";

interface Props {
  payload: { playerId: number; documentId: number; prevPhotoId: number; newPhotoId: string };
  meta?: unknown;
}

const OverrideDocumentPhotoDialog: FC<Props> = ({ payload }) => {
  const dispatch = useAppDispatch();

  const handleOverridePhotoDocument = useCallback(() => dispatch(overrideDocumentPhoto(payload)), [dispatch, payload]);
  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.OVERRIDE_DOCUMENT_PHOTO)), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <DialogTitle>Do you want to override this document?</DialogTitle>
      <DialogContent>
        <Box display="flex" justifyContent="space-around" maxWidth="700px">
          <Box maxHeight="200px" maxWidth="100%">
            <img src={`/api/v1/photos/${payload && payload.prevPhotoId}`} alt="document" />
          </Box>
          <Box maxHeight="200px" maxWidth="100%">
            <img src={`/api/v1/photos/${payload && payload.newPhotoId}`} alt="document" />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleClose}>
          No
        </Button>
        <Button color="primary" onClick={handleOverridePhotoDocument}>
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { OverrideDocumentPhotoDialog };
