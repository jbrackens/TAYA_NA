import { useParams } from "react-router-dom";
import Typography from "@mui/material/Typography";
import LockIcon from "@mui/icons-material/Lock";

import { PlayerWithUpdate } from "@idefix-backoffice/idefix/types";
import { sidebarSlice, useAppSelector } from "@idefix-backoffice/idefix/store";

export const usePlayerListItem = (player: PlayerWithUpdate) => {
  const { playerId } = useParams<{ playerId: string }>();
  const tab = useAppSelector(sidebarSlice.getTab);
  const { fullName, isAccountClosed, pendingTimeOfFirstWD, autoWithdrawals } = sidebarSlice.getAdditionalInfo(player);
  const taskTypes = sidebarSlice.displayType(player, tab);
  const selectedPlayer = player.id === Number(playerId);

  const formattedPendingTime = sidebarSlice.formatPendingTime(pendingTimeOfFirstWD as string);
  const firstAutoWithdrawal = autoWithdrawals.length !== 0 ? sidebarSlice.findFirstAutoWd(autoWithdrawals) : null;
  const delayedAcceptTime = firstAutoWithdrawal
    ? sidebarSlice.formatAutoWdTime(firstAutoWithdrawal.delayedAcceptTime)
    : null;
  const { online, withdrawals } = player;

  const primaryText = (
    <Typography display="flex" alignItems="center">
      {isAccountClosed && <LockIcon color="primary" sx={{ width: 20, height: 20, marginRight: 1 }} />} {fullName}
    </Typography>
  );

  const defaultSecondaryText = `${isAccountClosed ? "Closed" : `${taskTypes}`}`;
  const withdrawalsSecondaryText = withdrawals.length
    ? `${taskTypes} ${formattedPendingTime} ${firstAutoWithdrawal ? `Auto WD: ${delayedAcceptTime}` : ""}`
    : null;

  const secondaryText = tab === "withdrawals" ? withdrawalsSecondaryText : defaultSecondaryText;

  return {
    formattedPendingTime,
    autoWithdrawals,
    selectedPlayer,
    taskTypes,
    online,
    primaryText,
    secondaryText
  };
};
