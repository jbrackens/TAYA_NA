import React, { FC } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";

import { PlayerBonus } from "@idefix-backoffice/idefix/types";

import { useForfeitBonus } from "./hooks";

interface Props {
  payload: {
    playerId: number;
    bonus: PlayerBonus;
  };
  meta?: unknown;
}

const ForfeitBonusDialog: FC<Props> = ({ payload }) => {
  const { handleSubmit, handleClose } = useForfeitBonus(payload);

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

export { ForfeitBonusDialog };
