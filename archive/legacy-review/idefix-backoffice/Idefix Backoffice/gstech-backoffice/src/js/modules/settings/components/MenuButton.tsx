import React, { FC, useCallback, useState } from "react";
import Box from "@material-ui/core/Box";
import IconButton from "@material-ui/core/IconButton";
import ExpandMoreIcon from "@material-ui/icons/MoreVert";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import { Promotion } from "app/types";

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
