import { useEffect } from "react";
import { useParams } from "react-router-dom";

import {
  useAppDispatch,
  playerSlice,
  accountStatusSlice,
  limitsSlice,
  useAppSelector
} from "@idefix-backoffice/idefix/store";

export const usePlayer = () => {
  const dispatch = useAppDispatch();
  const params = useParams();
  const playerId = Number(params["playerId"]);

  const playerInfo = useAppSelector(playerSlice.getPlayerInfo);
  const isLoadingPlayerInfo = useAppSelector(playerSlice.getIsLoadingPlayerInfo);
  const accountStatus = useAppSelector(accountStatusSlice.getAccountStatus);
  const isLoadingAccountStatus = useAppSelector(accountStatusSlice.getIsLoadingAccountStatus);
  const activeLimits = useAppSelector(limitsSlice.getActiveLimits);
  const kycDocuments = playerInfo?.kycDocuments || [];
  const withdrawals = playerInfo?.withdrawals || [];
  const fraudIds = playerInfo?.fraudIds || [];

  useEffect(() => {
    dispatch(playerSlice.fetchPlayer(playerId));
    dispatch(accountStatusSlice.fetchAccountStatus(playerId));
    dispatch(limitsSlice.fetchActiveLimits(playerId));
  }, [dispatch, playerId]);

  return {
    playerInfo,
    isLoadingPlayerInfo,
    accountStatus,
    isLoadingAccountStatus,
    activeLimits,
    kycDocuments,
    withdrawals,
    fraudIds
  };
};
