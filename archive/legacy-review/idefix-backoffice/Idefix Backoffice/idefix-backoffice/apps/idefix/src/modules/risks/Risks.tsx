import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { FC } from "react";

import { CircularProgressbar, LoadingIndicator } from "@idefix-backoffice/idefix/components";

import { AccountStatusTable } from "./components/AccountStatusTable";
import { ConnectedPlayersTable } from "./components/ConnectedPlayersTable";
import { RisksTabs } from "./components/RisksTabs";
import { useRisks } from "./hooks";

const Risks: FC = () => {
  const {
    playerId,
    brands,
    riskType,
    total,
    connectedPlayers,
    isLoadingConnectedPlayers,
    isLoadingRisks,
    risksByType,
    isLoadingRisksByType,
    risksTabs,
    logs,
    isLoadingLogs,
    accountStatus,
    handleChangeType,
    handleAccountStatusToggle,
    handleOpenConnectedPlayer,
    handleAddPlayerConnection,
    handleDisconnectPlayer,
    handleOpenAskingForReasonDialog
  } = useRisks();

  return (
    <Box>
      <Box display="flex">
        {isLoadingRisks ? (
          <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
            <LoadingIndicator />
          </Box>
        ) : (
          <>
            <Box flexGrow={1} height="264px">
              <AccountStatusTable
                onAccountStatusToggle={handleAccountStatusToggle}
                onOpenAskingForReasonDialog={handleOpenAskingForReasonDialog}
                accountStatusValues={accountStatus}
              />
            </Box>
            <Box display="flex" justifyContent="center" alignItems="center" p="12px" width="202px" height="264px">
              <Box>
                <Box display="flex" justifyContent="center" alignItems="center" width="100%" height="100%">
                  <Box display="flex" flexDirection="column" justifyContent="center" width="104px" height="88px">
                    <CircularProgressbar value={total} circleRatio={0.6} />
                    <Typography>Current Risk Level</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </>
        )}
      </Box>

      <Divider light />

      <Box mt={3}>
        <Box>
          <ConnectedPlayersTable
            brands={brands}
            connectedPlayers={connectedPlayers}
            isConnectedPlayersLoading={isLoadingConnectedPlayers}
            onOpenConnectedPlayer={handleOpenConnectedPlayer}
            onAddPlayerConnection={handleAddPlayerConnection}
            onDisconnectPlayer={handleDisconnectPlayer}
          />
        </Box>
      </Box>

      <Divider light />

      <Box mt={3}>
        <Box paddingBottom={12}>
          <RisksTabs
            playerId={playerId}
            riskType={riskType}
            risksTabs={risksTabs}
            onChangeType={handleChangeType}
            risksByType={risksByType}
            logs={logs}
            isLoadingRisksByType={isLoadingRisksByType}
            isLoadingLogs={isLoadingLogs}
          />
        </Box>
      </Box>
    </Box>
  );
};

export { Risks };
