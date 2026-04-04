import React, { FC, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import AddPlayerConnection, { getError, getSelectedPlayers } from "../../modules/add-player-connection";
import { closeDialog } from "../";
import { connectPlayers } from "./actions";

interface Props {
  payload: {
    playerId: number;
  };
  meta?: unknown;
}

const AddPlayerConnectionDialog: FC<Props> = ({ payload: { playerId } }) => {
  const dispatch = useDispatch();
  const selectedPlayers = useSelector(getSelectedPlayers);
  const error = useSelector(getError);

  const handleSubmit = useCallback(() => {
    dispatch(connectPlayers({ playerId, playersIds: selectedPlayers }));
  }, [dispatch, playerId, selectedPlayers]);

  const handleClose = useCallback(() => dispatch(closeDialog("add-player-connection")), [dispatch]);

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
        <AddPlayerConnection playerId={playerId} />
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

export default AddPlayerConnectionDialog;
