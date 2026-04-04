import React, { FC, useCallback, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ExpandMoreIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import { ConnectedPlayer } from "@idefix-backoffice/idefix/types";

interface MenuProps {
  row: ConnectedPlayer;
  onOpenConnectedPlayer: (id: number) => void;
  onDisconnectPlayer: (id: number) => void;
}

const MenuButton: FC<MenuProps> = ({ row, onOpenConnectedPlayer, onDisconnectPlayer }) => {
  const { id } = row;
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const openActionsMenu = Boolean(anchorEl);

  const handleOpenActionsMenu = useCallback((event: React.MouseEvent) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleCloseActionsMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <Box>
      <IconButton onClick={handleOpenActionsMenu}>
        <ExpandMoreIcon />
      </IconButton>
      <Menu id="long-menu" anchorEl={anchorEl} keepMounted open={openActionsMenu} onClose={handleCloseActionsMenu}>
        <MenuItem onClick={() => onOpenConnectedPlayer(id)}>Open</MenuItem>
        <MenuItem onClick={() => onDisconnectPlayer(id)}>Disconnect</MenuItem>
      </Menu>
    </Box>
  );
};

export { MenuButton };
