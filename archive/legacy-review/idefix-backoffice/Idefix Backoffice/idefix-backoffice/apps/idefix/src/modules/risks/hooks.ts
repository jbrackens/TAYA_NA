import { useCallback, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { DIALOG, RiskStatus, RiskType } from "@idefix-backoffice/idefix/types";
import {
  risksSlice,
  dialogsSlice,
  useAppDispatch,
  useAppSelector,
  accountStatusSlice,
  appSlice
} from "@idefix-backoffice/idefix/store";

export const useRisks = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const connectedPlayers = useAppSelector(risksSlice.getConnectedPlayers);
  const isLoadingConnectedPlayers = useAppSelector(risksSlice.getIsConnectedPlayersLoading);
  const risks = useAppSelector(risksSlice.getRisks);
  const isLoadingRisks = useAppSelector(risksSlice.getIsRisksLoading);
  const risksByType = useAppSelector(risksSlice.getRisksByType);
  const isLoadingRisksByType = useAppSelector(risksSlice.getIsRisksByTypeLoading);
  const risksTabs = useAppSelector(risksSlice.getRisksTabs);
  const logs = useAppSelector(risksSlice.getLogs);
  const isLoadingLogs = useAppSelector(risksSlice.getIsLogsLoading);
  const accountStatus = useAppSelector(accountStatusSlice.getAccountStatus);
  const brands = useAppSelector(appSlice.getBrands);
  const params = useParams<{ playerId: string; riskType: string }>();
  const playerId = Number(params.playerId);
  const riskType = params.riskType as RiskType | undefined;
  const total = Number(risks.total) || 0;

  const handleChangeType = useCallback(
    (type: RiskType) => {
      const newPath = `${pathname.substring(0, pathname.lastIndexOf("/"))}/${type}`;
      navigate(newPath);
    },
    [navigate, pathname]
  );

  const handleAccountStatusToggle = useCallback(
    (field: string, value: boolean | RiskStatus) => {
      switch (field) {
        case "verified":
          return dispatch(
            dialogsSlice.openDialog("account-status", {
              title: "Player identity verified and Due Diligence completed",
              callback: (reason: string) =>
                dispatch(accountStatusSlice.updateAccountStatus({ playerId, field, value, reason }))
            })
          );
        case "pep":
          return dispatch(
            dialogsSlice.openDialog("account-status", {
              title: "Politically Exposed Person",
              callback: (reason: string) =>
                dispatch(accountStatusSlice.updateAccountStatus({ playerId, field, value, reason }))
            })
          );
        default:
          return null;
      }
    },
    [dispatch, playerId]
  );

  const handleOpenConnectedPlayer = useCallback((id: number) => navigate(`/players/@${id}/player-info`), [navigate]);

  const handleAddPlayerConnection = useCallback(
    () => dispatch(dialogsSlice.openDialog(DIALOG.ADD_PLAYER_CONNECTION, { playerId })),
    [dispatch, playerId]
  );

  const handleDisconnectPlayer = useCallback(
    (id: number) => dispatch(risksSlice.disconnectPlayerFromPerson({ playerId: id, currentPlayerId: playerId })),
    [dispatch, playerId]
  );
  const handleOpenAskingForReasonDialog = useCallback(
    (field: string, value: string) =>
      dispatch(dialogsSlice.openDialog(DIALOG.ASKING_FOR_REASON, { playerId, field, value })),
    [dispatch, playerId]
  );

  useEffect(() => {
    dispatch(risksSlice.fetchConnectedPlayers(playerId));
    dispatch(risksSlice.fetchRisks(playerId));
  }, [dispatch, playerId]);

  useEffect(() => {
    if (riskType) {
      dispatch(risksSlice.fetchRisksByType({ playerId, riskType }));
      dispatch(risksSlice.fetchLogs({ playerId, riskType }));
    }
  }, [dispatch, playerId, riskType]);

  return {
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
  };
};
