import { FC } from "react";
import { Outlet } from "react-router-dom";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";

import { PlayerTabs } from "./components/PlayerTabs";
import { PlayerStatus } from "./components/PlayerStatus";
import { usePlayer } from "./hooks";
import { PlayerSummary } from "./components/PlayerSummary";
import { CreateTaskFab } from "./components/CreateTaskFab";

const Player: FC = () => {
  const {
    playerInfo,
    isLoadingPlayerInfo,
    accountStatus,
    isLoadingAccountStatus,
    activeLimits,
    kycDocuments,
    withdrawals,
    fraudIds
  } = usePlayer();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" p={3}>
        <PlayerStatus playerInfo={playerInfo} isLoading={isLoadingPlayerInfo} />
        <PlayerSummary accountStatus={accountStatus} isLoading={isLoadingAccountStatus} activeLimits={activeLimits} />
      </Box>
      <PlayerTabs kycDocuments={kycDocuments} withdrawals={withdrawals} fraudIds={fraudIds} />
      <Divider orientation="horizontal" sx={{ height: "1px", width: "auto" }} />
      <Box height="calc(100vh - 201px)" overflow="auto">
        <Box p={3}>
          <Outlet />
        </Box>
        <Box position="fixed" right={16} bottom={16} zIndex={1}>
          <CreateTaskFab />
        </Box>
      </Box>
    </Box>
  );
};

export { Player };
