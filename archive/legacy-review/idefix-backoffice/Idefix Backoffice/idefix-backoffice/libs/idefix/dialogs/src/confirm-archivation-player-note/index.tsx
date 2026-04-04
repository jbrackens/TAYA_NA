import React, { FC } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import DialogActions from "@mui/material/DialogActions";

import { useConfirmArchPlayerNote } from "./hooks";

interface Props {
  payload: {
    playerId: number;
    noteId: string;
  };
  meta?: unknown;
}

const ConfirmArchivationPlayerNoteDialog: FC<Props> = ({ payload }) => {
  const { handleArchiveNote, handleCloseDialog } = useConfirmArchPlayerNote(payload);

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

export { ConfirmArchivationPlayerNoteDialog };
