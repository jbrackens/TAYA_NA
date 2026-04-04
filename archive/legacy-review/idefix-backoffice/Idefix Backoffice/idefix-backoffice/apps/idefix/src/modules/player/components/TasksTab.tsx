import { FC, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Tab, { TabProps } from "@mui/material/Tab";
import Popover from "@mui/material/Popover";
import MenuList from "@mui/material/MenuList";
import MenuItem from "@mui/material/MenuItem";

import { PlayerWithUpdate } from "@idefix-backoffice/idefix/types";
import { sidebarSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";

interface Props extends TabProps {
  kycDocuments: PlayerWithUpdate["kycDocuments"];
  withdrawals: PlayerWithUpdate["withdrawals"];
  fraudIds: PlayerWithUpdate["fraudIds"];
}

const TasksTab: FC<Props> = ({ kycDocuments, withdrawals, fraudIds, ...rest }) => {
  const dispatch = useAppDispatch();
  const params = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const playerId = Number(params.playerId);
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  const handleTabClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();

    setOpen(true);
    setAnchorEl(event.currentTarget);
  }, []);

  const handleRequestClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleItemClick = useCallback(
    (taskType: string) => () => {
      setOpen(false);
      dispatch(sidebarSlice.changePlayerTab(playerId, `tasks/${taskType}`));
      navigate(`/players/${playerId}/tasks/${taskType}`);
    },
    [dispatch, navigate, playerId]
  );

  let tasksCount = 0;
  tasksCount += kycDocuments.length;
  tasksCount += withdrawals.length;
  tasksCount += fraudIds.length;

  return (
    <>
      <Tab
        label={`Pending Tasks${tasksCount ? `: ${tasksCount}` : ""}`}
        disabled={tasksCount === 0}
        onClick={handleTabClick}
      />
      {tasksCount !== 0 && (
        <Popover
          open={open}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "center"
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "center"
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

export { TasksTab };
