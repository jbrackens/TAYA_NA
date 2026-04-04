import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import RisksTabs from "./components/Tabs";
import ConnectedPlayersTable from "./components/ConnectedPlayersTable";
import AccountStatusTable from "./components/AccountStatusTable";
import ProgressBar from "../../core/components/new-card/components/ProgressBar";
import Loading from "../../core/components/Loading";
import { ConnectedPlayer, PlayerAccountStatus, RiskLog, RiskStatus, RiskType } from "app/types";
import Divider from "@material-ui/core/Divider";

const useStyles = makeStyles(theme => ({
  progressBar: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  progressBarText: {
    textAlign: "center",
    fontWeight: "normal",
    fontSize: "12px",
    lineHeight: "16px",
    color: theme.colors.blackDark,
  },
}));

interface Props {
  connectedPlayers: ConnectedPlayer[];
  risks: Partial<Record<RiskType | "total", number>>;
  risksByType: RiskStatus[];
  risksTabs: [string, number][];
  logs: RiskLog[];
  isConnectedPlayersLoading: boolean;
  isRisksLoading?: boolean;
  isRisksByTypeLoading: boolean;
  isLogsLoading: boolean;
  onChangeType: (type: RiskType) => void;
  onAccountStatusToggle: (field: string, value: boolean | RiskStatus) => void;
  onOpenAskingForReasonDialog: (field: string, value: string) => void;
  onOpenConnectedPlayer: (id: number) => void;
  onAddPlayerConnection: () => void;
  onDisconnectPlayer: (id: number) => void;
  accountStatusValues: PlayerAccountStatus;
}

export default ({
  connectedPlayers,
  risks,
  risksByType,
  risksTabs,
  logs,
  isConnectedPlayersLoading,
  isRisksLoading,
  isRisksByTypeLoading,
  isLogsLoading,
  onChangeType,
  onAccountStatusToggle,
  onOpenAskingForReasonDialog,
  onOpenConnectedPlayer,
  onAddPlayerConnection,
  onDisconnectPlayer,
  accountStatusValues,
}: Props) => {
  const classes = useStyles();
  const total = risks.total || 0;

  return (
    <Box p={3}>
      <Box display="flex">
        {isRisksLoading ? (
          <Box display="flex" justifyContent="center">
            <Loading />
          </Box>
        ) : (
          <>
            <Box flexGrow={1} height="264px">
              <AccountStatusTable
                onAccountStatusToggle={onAccountStatusToggle}
                onOpenAskingForReasonDialog={onOpenAskingForReasonDialog}
                accountStatusValues={accountStatusValues}
              />
            </Box>
            <Box display="flex" p="12px" width="202px" height="264px">
              <Divider light orientation="vertical" />
              <Box className={classes.progressBar}>
                <Box display="flex" flexDirection="column">
                  <Box width="104px" height="88px">
                    <ProgressBar value={total} withText />
                  </Box>
                  <Typography className={classes.progressBarText}>Current Risk Level</Typography>
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
            connectedPlayers={connectedPlayers}
            isConnectedPlayersLoading={isConnectedPlayersLoading}
            onOpenConnectedPlayer={onOpenConnectedPlayer}
            onAddPlayerConnection={onAddPlayerConnection}
            onDisconnectPlayer={onDisconnectPlayer}
          />
        </Box>
      </Box>

      <Divider light />

      <Box mt={3}>
        <Box paddingBottom={12}>
          <RisksTabs
            risksTabs={risksTabs}
            onChangeType={onChangeType}
            risksByType={risksByType}
            logs={logs}
            isRisksByTypeLoading={isRisksByTypeLoading}
            isLogsLoading={isLogsLoading}
          />
        </Box>
      </Box>
    </Box>
  );
};
