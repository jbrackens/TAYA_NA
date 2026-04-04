import { useEffect } from "react";
import { useAppDispatch, playerInfoSlice, useAppSelector } from "@idefix-backoffice/idefix/store";
import { useParams } from "react-router-dom";

export const usePlayerRegistrationInfo = () => {
  const dispatch = useAppDispatch();
  const registrationInfo = useAppSelector(playerInfoSlice.getRegistrationInfo);
  const isLoadingRegistrationInfo = useAppSelector(playerInfoSlice.getIsLoadingRegistrationInfo);
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);

  useEffect(() => {
    if (playerId) {
      dispatch(playerInfoSlice.fetchRegistrationInfo(playerId));
    }
  }, [dispatch, playerId]);

  return { registrationInfo, isLoadingRegistrationInfo };
};
