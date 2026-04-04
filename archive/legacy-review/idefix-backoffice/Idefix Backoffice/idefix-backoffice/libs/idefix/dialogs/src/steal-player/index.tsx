import React, { FC } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import DialogActions from "@mui/material/DialogActions";
import DialogTitle from "@mui/material/DialogTitle";

import { useStealPlayer } from "./hooks";

interface Props {
  payload: { playerId: number; taskIdentifier: string };
  meta?: unknown;
}

const StealPlayerDialog: FC<Props> = ({ payload }) => {
  const { handleShowTask, handleStealLock, handleClose, user } = useStealPlayer(payload);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <DialogTitle>Open task</DialogTitle>
      <DialogContent>
        <Typography>
          This task is already being processed by {user && user.handle}. Are you sure you want to open it?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleClose}>
          No, don't open it
        </Button>
        <Button color="primary" onClick={handleShowTask}>
          Yes, open task
        </Button>
        <Button color="primary" onClick={handleStealLock}>
          Yes, tag task to me
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { StealPlayerDialog };
