import React, { FC, useCallback, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ExpandMoreIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import { Promotion } from "@idefix-backoffice/idefix/types";

interface MenuProps {
  row: Promotion;
  onEditPromotion: (setting: any, settingNameKey: string, dialogName: string) => void;
  onArchive: (id: number, settingsType: string) => void;
}

const MenuButton: FC<MenuProps> = ({ row, onEditPromotion, onArchive }) => {
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
        <MenuItem onClick={() => onEditPromotion(row, "promotion", "edit-promotion")}>Edit</MenuItem>
        <MenuItem onClick={() => onArchive(row.id, "promotions")}>Archive</MenuItem>
      </Menu>
    </Box>
  );
};

export { MenuButton };
