import React, { useState } from "react";
import Tab, { TabProps } from "@material-ui/core/Tab";
import Badge from "@material-ui/core/Badge";
import { withStyles } from "@material-ui/core/styles";
import Popover from "@material-ui/core/Popover";
import MenuList from "@material-ui/core/MenuList";
import MenuItem from "@material-ui/core/MenuItem";
import { PlayerStatus, PlayerWithUpdate } from "app/types";

const StyledBadge = withStyles(() => ({
  badge: {
    top: 20,
    right: 16,
    transform: "translateY(-10px)",
  },
}))(Badge);

interface Props extends TabProps {
  kycDocuments: PlayerWithUpdate["kycDocuments"];
  withdrawals: PlayerWithUpdate["withdrawals"];
  fraudIds: PlayerWithUpdate["fraudIds"];
  balance?: PlayerStatus["balance"];
  onTaskClick: (taskType: string) => void;
}

const PendingTasksMenu = ({ kycDocuments, withdrawals, fraudIds, balance, onTaskClick, ...rest }: Props) => {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  const handleTouchTap = (event: React.MouseEvent) => {
    event.preventDefault();

    setOpen(true);
    setAnchorEl(event.currentTarget);
  };

  const handleRequestClose = () => {
    setOpen(false);
  };

  const handleItemClick = (taskType: string) => () => {
    handleRequestClose();
    onTaskClick(taskType);
  };

  let tasksCount = 0;
  tasksCount += kycDocuments.length;
  tasksCount += withdrawals.length;
  tasksCount += fraudIds.length;

  return (
    <>
      <StyledBadge badgeContent={tasksCount} color="primary">
        <Tab
          disabled={tasksCount < 1}
          label="Pending Tasks"
          {...rest}
          onClick={handleTouchTap}
          style={
            tasksCount > 10
              ? { paddingRight: "46px" }
              : tasksCount !== 0
              ? { paddingRight: "40px" }
              : { paddingRight: "16px" }
          }
        />
      </StyledBadge>
      {tasksCount >= 1 && (
        <Popover
          open={open}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
          onClose={handleRequestClose}
        >
          <MenuList>
            {kycDocuments.map(({ id, name }: { id: number; name: string }) => (
              <MenuItem key={id} onClick={handleItemClick(`kyc/${id}`)}>
                {!name ? `Document #${id}` : `Document ${name}`}
              </MenuItem>
            ))}
            {fraudIds.map((fraudId: number) => (
              <MenuItem
                key={fraudId}
                onClick={handleItemClick(`fraud/${fraudId}`)}
              >{`Fraud Check #${fraudId}`}</MenuItem>
            ))}
            {withdrawals.map(({ id, amount }: { id: string; amount: number }) => (
              <MenuItem key={id} onClick={handleItemClick(`withdrawal/${id}`)}>{`Withdrawal ${amount}`}</MenuItem>
            ))}
          </MenuList>
        </Popover>
      )}
    </>
  );
};

export default PendingTasksMenu;
