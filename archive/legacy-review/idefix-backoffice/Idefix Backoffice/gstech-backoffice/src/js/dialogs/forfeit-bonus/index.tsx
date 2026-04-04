import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import { PlayerBonus } from "app/types";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Typography from "@material-ui/core/Typography";
import { closeDialog } from "../";
import { forfeitBonus } from "./actions";

interface Props {
  payload: {
    playerId: number;
    bonus: PlayerBonus;
  };
  meta?: unknown;
}

const ForfeitBonusDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const { playerId, bonus } = payload;

  const handleSubmit = useCallback(() => dispatch(forfeitBonus(playerId, bonus.id)), [bonus, dispatch, playerId]);

  const handleClose = useCallback(() => dispatch(closeDialog("forfeit-bonus")), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <DialogTitle>Credit bonus</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to forfeit bonus {payload && payload.bonus && payload.bonus.bonus}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary">
          Forfeit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForfeitBonusDialog;
