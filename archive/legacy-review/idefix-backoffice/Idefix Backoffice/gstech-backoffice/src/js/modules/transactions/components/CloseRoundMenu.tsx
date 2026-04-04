import React from "react";
import OpenIcon from "@material-ui/icons/Cached";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles({
  openIcon: {
    cursor: "pointer",
  },
});

interface Props {
  onClose: () => void;
  onRefund: () => void;
}

const CloseRoundMenu = ({ onClose, onRefund }: Props) => {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState<SVGElement | null>(null);

  function handleOpenMenu(event: React.MouseEvent<SVGElement>) {
    setAnchorEl(event.currentTarget);
  }

  function handleCloseMenu() {
    setAnchorEl(null);
  }

  const handleClose = () => {
    handleCloseMenu();
    onClose();
  };

  const handleRefund = () => {
    handleCloseMenu();
    onRefund();
  };

  return (
    <>
      <OpenIcon onClick={handleOpenMenu} className={classes.openIcon} color="primary" />
      <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem onClick={handleClose}>Close round</MenuItem>
        <MenuItem onClick={handleRefund}>Cancel and refund</MenuItem>
      </Menu>
    </>
  );
};

export default CloseRoundMenu;
