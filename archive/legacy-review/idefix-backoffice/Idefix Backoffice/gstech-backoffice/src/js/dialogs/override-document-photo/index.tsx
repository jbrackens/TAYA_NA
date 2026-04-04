import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { overrideDocumentPhoto } from "./actions";
import { closeDialog } from "../";

interface Props {
  payload: { playerId: number; documentId: number; prevPhotoId: number; newPhotoId: string };
  meta?: unknown;
}

const OverrideDocumentPhotoDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();

  const handleOverridePhotoDocument = useCallback(() => dispatch(overrideDocumentPhoto(payload)), [dispatch, payload]);
  const handleClose = useCallback(() => dispatch(closeDialog("override-document-photo")), [dispatch]);

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

export default OverrideDocumentPhotoDialog;
