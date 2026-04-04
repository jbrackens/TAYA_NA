import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import Typography from "@material-ui/core/Typography";
import DialogActions from "@material-ui/core/DialogActions";
import { closeDialog } from "../";
import { confirmArchiveBonus, confirmArchivePromotion } from "./actions";

interface Props {
  payload: {
    id: number;
    brandId: string;
    settingsType: string;
  };
  meta?: unknown;
}

const ConfirmArchiveBonus: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();

  const handleArchive = useCallback(() => {
    const { settingsType } = payload;

    if (settingsType === "bonuses") {
      return dispatch(confirmArchiveBonus(payload));
    }

    dispatch(confirmArchivePromotion(payload));
  }, [dispatch, payload]);

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("confirm-archivation")), [dispatch]);

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

export default ConfirmArchiveBonus;
