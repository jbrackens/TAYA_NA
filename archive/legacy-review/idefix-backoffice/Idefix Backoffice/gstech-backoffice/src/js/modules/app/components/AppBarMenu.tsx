import React, { useState } from "react";
import Menu from "@material-ui/core/Menu";
import IconButton from "@material-ui/core/IconButton";
import MenuItem from "@material-ui/core/MenuItem";
import MoreVertIcon from "@material-ui/icons/MoreVert";

export default ({ expirePassword, logout }: { expirePassword: () => void; logout: () => void }) => {
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  function handleClick(event: React.MouseEvent) {
    setAnchorEl(event.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  function handleLogout() {
    handleClose();
    logout();
  }

  function handleExpirePassword() {
    handleClose();
    expirePassword();
  }

  return (
    <>
      <IconButton aria-controls="simple-menu" aria-haspopup="true" edge="end" onClick={handleClick}>
        <MoreVertIcon />
      </IconButton>
      <Menu id="simple-menu" anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={handleExpirePassword}>Change password</MenuItem>
        <MenuItem onClick={handleLogout}>Sign out</MenuItem>
      </Menu>
    </>
  );
};
