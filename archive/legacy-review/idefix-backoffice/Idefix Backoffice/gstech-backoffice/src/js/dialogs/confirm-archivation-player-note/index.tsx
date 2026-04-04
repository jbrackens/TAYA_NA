import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import Typography from "@material-ui/core/Typography";
import DialogActions from "@material-ui/core/DialogActions";
import { closeDialog } from "../";
import { archiveNote } from "./actions";

interface Props {
  payload: {
    playerId: number;
    noteId: string;
  };
  meta?: unknown;
}

const ConfirmArchivationPlayerNote: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const { playerId, noteId } = payload;

  const handleArchiveNote = useCallback(() => {
    dispatch(archiveNote({ playerId, noteId: Number(noteId) }));
  }, [dispatch, noteId, playerId]);

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("confirm-archivation-player-note")), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleCloseDialog}>
      <DialogTitle>Confirm archivation</DialogTitle>
      <DialogContent>
        <Typography>Are you sure?</Typography>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleCloseDialog}>
          Cancel
        </Button>
        <Button color="primary" onClick={handleArchiveNote}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmArchivationPlayerNote;
