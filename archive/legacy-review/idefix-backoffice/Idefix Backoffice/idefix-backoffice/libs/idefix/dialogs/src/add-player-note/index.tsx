import React, { FC } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { Mde } from "@idefix-backoffice/idefix/components";
import { useAddPlayerNote } from "./hooks";

interface Props {
  payload: number;
  meta?: unknown;
}

const AddPlayerNoteDialog: FC<Props> = ({ payload: playerId }) => {
  const { handleCreateNote, handleCancel, value, error, setValue } = useAddPlayerNote(playerId);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleCancel} maxWidth="md">
      <DialogTitle>Add Player Note</DialogTitle>
      <DialogContent>
        {error && (
          <Box component="span" fontSize={14} color="#f44336">
            {error.message}
          </Box>
        )}
        <Mde value={value} onChange={setValue} />
        {error && error.errors && error.errors.content && (
          <Box component="span" fontSize={14} color="#f44336">
            {error.errors.content}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button color="primary" onClick={handleCreateNote} disabled={value === ""}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { AddPlayerNoteDialog };
