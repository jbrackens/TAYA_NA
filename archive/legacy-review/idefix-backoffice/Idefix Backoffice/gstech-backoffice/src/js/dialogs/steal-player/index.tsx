import React, { FC, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import Typography from "@material-ui/core/Typography";
import DialogActions from "@material-ui/core/DialogActions";
import DialogTitle from "@material-ui/core/DialogTitle";
import { changePlayerTab, getLockedPlayerUser } from "../../modules/sidebar";
import { closeDialog } from "../";
import { stealLock } from "./actions";
import { RootState } from "js/rootReducer";

interface Props {
  payload: { playerId: number; taskIdentifier: string };
  meta?: unknown;
}

const StealPlayerDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const { playerId, taskIdentifier } = payload;
  const user = useSelector((state: RootState) => getLockedPlayerUser(state, playerId));

  const handleShowTask = useCallback(() => {
    dispatch(changePlayerTab(playerId, `tasks/${taskIdentifier}`, true));
    dispatch(closeDialog("steal-player"));
  }, [dispatch, playerId, taskIdentifier]);

  const handleStealLock = useCallback(
    () => dispatch(stealLock(playerId, taskIdentifier)),
    [dispatch, playerId, taskIdentifier],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("steal-player")), [dispatch]);

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

export default StealPlayerDialog;
