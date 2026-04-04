import { FC, useCallback, useState, MouseEvent } from "react";
import { useParams } from "react-router-dom";
import Fab from "@mui/material/Fab";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import AddIcon from "@mui/icons-material/Add";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

const CreateTaskFab: FC = () => {
  const dispatch = useAppDispatch();
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpenMenu = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleOpenDialog = useCallback(
    (dialog: DIALOG) => () => {
      dispatch(dialogsSlice.openDialog(dialog, playerId));
    },
    [dispatch, playerId]
  );

  return (
    <>
      <Fab color="primary" aria-label="add" onClick={handleOpenMenu}>
        <AddIcon />
      </Fab>
      <Menu anchorEl={anchorEl} open={open} onClose={handleCloseMenu}>
        <MenuItem onClick={handleOpenDialog(DIALOG.ADD_PLAYER_NOTE)}>Add player note</MenuItem>
        <MenuItem onClick={handleOpenDialog(DIALOG.ADD_PAYMENT_ACCOUNT)}>Add payment account</MenuItem>
        <MenuItem onClick={handleOpenDialog(DIALOG.ADD_TRANSACTION)}>Add transaction</MenuItem>
        <MenuItem onClick={handleOpenDialog(DIALOG.CREDIT_BONUS)}>Credit bonus</MenuItem>
        <MenuItem onClick={handleOpenDialog(DIALOG.ADD_DOCUMENTS)}>Add documents</MenuItem>
        <MenuItem onClick={handleOpenDialog(DIALOG.REQUEST_DOCUMENTS)}>Request documents</MenuItem>
        <MenuItem onClick={handleOpenDialog(DIALOG.REGISTER_GAMBLING_PROBLEM)}>Register Gambling Problem</MenuItem>
        <MenuItem onClick={handleOpenDialog(DIALOG.TRIGGER_MANUAL_TASK)}>Trigger risk</MenuItem>
      </Menu>
    </>
  );
};

export { CreateTaskFab };
