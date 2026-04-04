import React, { FC, ReactNode } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import { useAddPlayerConnection } from "./hooks";

interface Props {
  children: ReactNode;
  payload: {
    playerId: number;
  };
  meta?: unknown;
}

const AddPlayerConnectionDialog: FC<Props> = ({ children, payload: { playerId } }) => {
  const { handleSubmit, handleClose, selectedPlayers, error } = useAddPlayerConnection(playerId);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose} maxWidth="xl">
      <DialogTitle>Add Player Connection Manually</DialogTitle>
      <DialogContent>
        {error && (
          <Box mb={1}>
            {/*  @ts-ignore */}
            <Typography color="error">{error.error}</Typography>
          </Box>
        )}
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button type="submit" onClick={handleSubmit} color="primary" disabled={!selectedPlayers.length}>
          Connect
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { AddPlayerConnectionDialog };
