import React, { useState, useCallback, MouseEvent } from "react";
import Box from "@material-ui/core/Box";
import Fab from "@material-ui/core/Fab";
import AddIcon from "@material-ui/icons/Add";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";

interface Props {
  onCreateUser: () => void;
}

export default function CreateUserMenu({ onCreateUser }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);
  const handleClose = useCallback(() => setAnchorEl(null), []);

  return (
    <Box>
      <Fab onClick={handleClick} color="primary" aria-label="add">
        <AddIcon />
      </Fab>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <MenuItem
          onClick={() => {
            onCreateUser();
            handleClose();
          }}
        >
          Create user
        </MenuItem>
      </Menu>
    </Box>
  );
}
