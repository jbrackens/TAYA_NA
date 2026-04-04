import React, { FC, useCallback, useState } from "react";
import Box from "@material-ui/core/Box";
import IconButton from "@material-ui/core/IconButton";
import ExpandMoreIcon from "@material-ui/icons/MoreVert";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import { ConnectedPlayer } from "app/types";

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
