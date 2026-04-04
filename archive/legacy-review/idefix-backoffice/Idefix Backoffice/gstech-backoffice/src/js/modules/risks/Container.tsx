import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RouteProps, useLocation, useNavigate, useParams } from "react-router-dom";
import Component from "./Component";
import {
  disconnectPlayerFromPerson,
  fetchConnectedPlayers,
  fetchLogs,
  fetchRisks,
  fetchRisksByType,
  getConnectedPlayers,
  getIsConnectedPlayersLoading,
  getIsLogsLoading,
  getIsRisksByTypeLoading,
  getIsRisksLoading,
  getLogs,
  getRisks,
  getRisksByType,
  getRisksTabs,
} from "./risksSlice";
import { openDialog } from "../../dialogs";
import { getAccountStatusState, updateAccountStatus } from "../account-status";
import { RiskStatus, RiskType } from "app/types";

const Container = (props: RouteProps) => {
  const dispatch = useDispatch();
  const connectedPlayers = useSelector(getConnectedPlayers);
  const isConnectedPlayersLoading = useSelector(getIsConnectedPlayersLoading);
  const risks = useSelector(getRisks);
  const risksByType = useSelector(getRisksByType);
  const risksTabs = useSelector(getRisksTabs);
  const isRisksLoading = useSelector(getIsRisksLoading);
  const isRisksByTypeLoading = useSelector(getIsRisksByTypeLoading);
  const logs = useSelector(getLogs);
  const isLogsLoading = useSelector(getIsLogsLoading);
  const { values } = useSelector(getAccountStatusState);

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const playerId = Number(params.playerId);
  const riskType = params.riskType as RiskType;

  const handleChangeType = useCallback(
    (type: RiskType) => {
      const newPath = `${pathname.substring(0, pathname.lastIndexOf("/"))}/${type}`;
      navigate(newPath);
    },
    [pathname, navigate],
  );

  const handleAccountStatusToggle = useCallback(
    (field: string, value: boolean | RiskStatus) => {
      switch (field) {
        case "verified":
          return dispatch(
            openDialog("account-status", {
              title: "Player identity verified and Due Diligence completed",
              callback: (reason: string) => dispatch(updateAccountStatus({ playerId, field, value, reason })),
            }),
          );
        case "pep":
          return dispatch(
            openDialog("account-status", {
              title: "Politically Exposed Person",
              callback: (reason: string) => dispatch(updateAccountStatus({ playerId, field, value, reason })),
            }),
          );
        default:
          return null;
      }
    },

    [dispatch, playerId],
  );

  const handleOpenConnectedPlayer = useCallback((id: number) => navigate(`/players/@${id}/player-info`), [navigate]);

  const handleAddPlayerConnection = useCallback(
    () => dispatch(openDialog("add-player-connection", { playerId })),
    [dispatch, playerId],
  );

  const handleDisconnectPlayer = useCallback(
    (id: number) => dispatch(disconnectPlayerFromPerson({ playerId: id, currentPlayerId: playerId })),
    [dispatch, playerId],
  );

  const handleOpenAskingForReasonDialog = useCallback(
    (field: string, value: string) => dispatch(openDialog("asking-for-reason", { playerId, field, value })),
    [dispatch, playerId],
  );

  useEffect(() => {
    dispatch(fetchConnectedPlayers(playerId));
    dispatch(fetchRisks(playerId));
  }, [dispatch, playerId]);

  useEffect(() => {
    if (riskType) {
      dispatch(fetchRisksByType({ playerId, riskType }));
      dispatch(fetchLogs({ playerId, riskType }));
    }
  }, [dispatch, playerId, riskType]);

  return (
    <Component
      {...props}
      isConnectedPlayersLoading={isConnectedPlayersLoading}
      isRisksLoading={isRisksLoading}
      isRisksByTypeLoading={isRisksByTypeLoading}
      isLogsLoading={isLogsLoading}
      connectedPlayers={connectedPlayers}
      risks={risks}
      risksByType={risksByType}
      logs={logs}
      risksTabs={risksTabs}
      onChangeType={handleChangeType}
      onAccountStatusToggle={handleAccountStatusToggle}
      onOpenAskingForReasonDialog={handleOpenAskingForReasonDialog}
      onOpenConnectedPlayer={handleOpenConnectedPlayer}
      onAddPlayerConnection={handleAddPlayerConnection}
      onDisconnectPlayer={handleDisconnectPlayer}
      accountStatusValues={values}
    />
  );
};

export default Container;
