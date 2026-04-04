import React, { FC, useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { closeDialog } from "../";
import { addPlayerNote } from "./actions";
import Mde from "../../core/components/mde";

interface Props {
  payload: number;
  meta?: unknown;
}

const AddPlayerNoteDialog: FC<Props> = ({ payload: playerId }) => {
  const dispatch = useDispatch();
  const [value, setValue] = useState<string>("");
  const [error, setError] = useState<{ message: string; errors: any } | undefined>(undefined);

  const handleCreateNote = useCallback(async () => {
    try {
      await dispatch(addPlayerNote({ playerId, value }));
      setValue("");
    } catch (err) {
      setError({ message: err.message, errors: err.errors });
    }
  }, [dispatch, playerId, value]);

  const handleCancel = useCallback(() => {
    setValue("");
    setError(undefined);
    dispatch(closeDialog("add-player-note"));
  }, [dispatch]);

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

export default AddPlayerNoteDialog;
