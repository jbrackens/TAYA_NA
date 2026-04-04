import React, { useState, useCallback } from "react";
import Box from "@material-ui/core/Box";
import Fab from "@material-ui/core/Fab";
import ContentAdd from "@material-ui/icons/Add";
import Popover from "@material-ui/core/Popover";
import MenuList from "@material-ui/core/MenuList";
import MenuItem from "@material-ui/core/MenuItem";

interface Props {
  onAddPaymentAccount: () => void;
  onAddPlayerNote: () => void;
  onAddTransaction: () => void;
  onCreditBonus: () => void;
  onRegisterGambling: () => void;
  onTriggerManualTask: () => void;
  onAddDocuments: () => void;
  onRequestDocuments: () => void;
}

function CreateTaskMenu(props: Props) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  const handleTouchTap = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setOpen(true);
    setAnchorEl(event.currentTarget);
  }, []);

  const handleRequestClose = useCallback(() => {
    setAnchorEl(null);
    setOpen(false);
  }, []);

  const handleAddPaymentAccount = useCallback(() => {
    const { onAddPaymentAccount } = props;

    handleRequestClose();
    onAddPaymentAccount();
  }, [handleRequestClose, props]);

  const handleAddPlayerNote = useCallback(() => {
    const { onAddPlayerNote } = props;

    handleRequestClose();
    onAddPlayerNote();
  }, [handleRequestClose, props]);

  const handleAddTransaction = useCallback(() => {
    const { onAddTransaction } = props;

    handleRequestClose();
    onAddTransaction();
  }, [handleRequestClose, props]);

  const handleCreditBonus = useCallback(() => {
    const { onCreditBonus } = props;

    handleRequestClose();
    onCreditBonus();
  }, [handleRequestClose, props]);

  const handleAddDocuments = useCallback(() => {
    const { onAddDocuments } = props;

    handleRequestClose();
    onAddDocuments();
  }, [handleRequestClose, props]);

  const handleRegisterGambling = useCallback(() => {
    const { onRegisterGambling } = props;

    handleRequestClose();
    onRegisterGambling();
  }, [handleRequestClose, props]);

  const handleTriggerManualTask = useCallback(() => {
    const { onTriggerManualTask } = props;

    handleRequestClose();
    onTriggerManualTask();
  }, [handleRequestClose, props]);

  const handleRequestDocuments = useCallback(() => {
    const { onRequestDocuments } = props;

    handleRequestClose();
    onRequestDocuments();
  }, [handleRequestClose, props]);

  return (
    <Box>
      <Fab color="primary" onClick={handleTouchTap}>
        <ContentAdd />
      </Fab>
      <Popover
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        onClose={handleRequestClose}
      >
        <MenuList>
          <MenuItem onClick={handleAddPlayerNote}>Add player note</MenuItem>
          <MenuItem onClick={handleAddPaymentAccount}>Add payment account</MenuItem>
          <MenuItem onClick={handleAddTransaction}>Add transaction</MenuItem>
          <MenuItem onClick={handleCreditBonus}>Credit bonus</MenuItem>
          <MenuItem onClick={handleAddDocuments}>Add documents</MenuItem>
          <MenuItem onClick={handleRequestDocuments}>Request documents</MenuItem>
          <MenuItem onClick={handleRegisterGambling}>Register Gambling Problem</MenuItem>
          <MenuItem onClick={handleTriggerManualTask}>Trigger risk</MenuItem>
        </MenuList>
      </Popover>
    </Box>
  );
}

export default CreateTaskMenu;
