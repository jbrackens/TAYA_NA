import React, { FC } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import DialogActions from "@mui/material/DialogActions";

import { useConfirmArchivation } from "./hooks";

interface Props {
  payload: {
    id: number;
    brandId: string;
    settingsType: string;
  };
  meta?: unknown;
}

const ConfirmArchiveBonusDialog: FC<Props> = ({ payload }) => {
  const { handleArchive, handleCloseDialog } = useConfirmArchivation(payload);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleCloseDialog}>
      <DialogTitle>Confirmation</DialogTitle>
      <DialogContent>
        <Typography>Are you sure?</Typography>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleCloseDialog}>
          Cancel
        </Button>
        <Button color="primary" onClick={handleArchive}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { ConfirmArchiveBonusDialog };
