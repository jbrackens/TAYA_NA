import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { FC } from "react";

import { useConfirmation } from "./hooks";

interface Props {
  payload: { callback: () => void };
}

const ConfirmationDialog: FC<Props> = ({ payload }) => {
  const { handleSubmit, handleCloseDialog } = useConfirmation(payload);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleCloseDialog}>
      <DialogTitle>Confirmation</DialogTitle>
      <DialogContent>
        <DialogContentText>Are you sure?</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleCloseDialog}>
          No
        </Button>
        <Button color="primary" onClick={handleSubmit}>
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { ConfirmationDialog };
