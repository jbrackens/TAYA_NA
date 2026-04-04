import { FC, memo } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Badge from "@mui/material/Badge";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";

import { PlayerWithUpdate } from "@idefix-backoffice/idefix/types";

import { usePlayerListItem } from "../hooks/usePlayerListItem";

const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: "#44b700",
    color: "#44b700",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "ripple 1.2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""'
    }
  },
  "@keyframes ripple": {
    "0%": {
      transform: "scale(.8)",
      opacity: 1
    },
    "100%": {
      transform: "scale(2.4)",
      opacity: 0
    }
  }
}));

interface Props {
  player: PlayerWithUpdate;
  onClick: (playerId: number) => () => void;
  onRemove?: (playerId: number) => () => void;
  tab: string;
}

const PlayersListItem: FC<Props> = memo(({ player, onClick, onRemove, tab }) => {
  const { formattedPendingTime, autoWithdrawals, selectedPlayer, taskTypes, online, primaryText, secondaryText } =
    usePlayerListItem(player);

  return (
    <ListItem
      disablePadding
      secondaryAction={
        onRemove && (
          <Tooltip title="Remove from recent">
            <IconButton edge="end" aria-label="delete" onClick={onRemove(player.id)}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        )
      }
    >
      <ListItemButton onClick={selectedPlayer ? undefined : onClick(player.id)} selected={selectedPlayer}>
        <ListItemAvatar>
          {online ? (
            <StyledBadge overlap="circular" anchorOrigin={{ vertical: "bottom", horizontal: "right" }} variant="dot">
              <Avatar src={`../../assets/brands/${player.brandId}@2x.png`} />
            </StyledBadge>
          ) : (
            <Avatar src={`../../assets/brands/${player.brandId}@2x.png`} />
          )}
        </ListItemAvatar>
        <ListItemText primary={primaryText} secondary={secondaryText} />
      </ListItemButton>
    </ListItem>
  );
});

export { PlayersListItem };
