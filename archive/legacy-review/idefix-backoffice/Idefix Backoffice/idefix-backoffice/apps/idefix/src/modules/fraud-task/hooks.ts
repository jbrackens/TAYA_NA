import { useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";

import {
  useAppDispatch,
  useAppSelector,
  fraudTaskSlice,
  sidebarSlice,
  playerSlice
} from "@idefix-backoffice/idefix/store";

export const useFraudTask = () => {
  const dispatch = useAppDispatch();
  const params = useParams<{ playerId: string; playerFraudId: string }>();
  const playerFraud = useAppSelector(fraudTaskSlice.getFraudTask);
  const [resolution, setResolution] = useState("");
  const playerId = Number(params.playerId);
  const playerFraudId = Number(params.playerFraudId);

  const handleClear = useCallback(
    async (resolution?: string) => {
      if (resolution) {
        await dispatch(fraudTaskSlice.clearFraudPoints({ playerId, playerFraudId, resolution }));
      } else {
        await dispatch(fraudTaskSlice.clearFraudPoints({ playerId, playerFraudId }));
      }
      dispatch(sidebarSlice.changePlayerTab(playerId, "player-info"));
      dispatch(playerSlice.fetchPlayer(playerId));
      dispatch(sidebarSlice.updatePlayerList());
    },
    [dispatch, playerFraudId, playerId]
  );

  const handleKeep = useCallback(
    async (resolution?: string) => {
      if (resolution) {
        await dispatch(fraudTaskSlice.keepFraudPoints({ playerId, playerFraudId, resolution }));
      } else {
        await dispatch(fraudTaskSlice.keepFraudPoints({ playerId, playerFraudId }));
      }
      dispatch(sidebarSlice.changePlayerTab(playerId, "player-info"));
      dispatch(playerSlice.fetchPlayer(playerId));
      dispatch(sidebarSlice.updatePlayerList());
    },
    [dispatch, playerId, playerFraudId]
  );

  useEffect(() => {
    dispatch(fraudTaskSlice.fetchPlayerFraud({ playerId, playerFraudId }));
  }, [dispatch, playerId, playerFraudId]);

  return { playerFraud, handleClear, handleKeep, resolution, setResolution };
};
