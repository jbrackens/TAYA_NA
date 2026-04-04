import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { changePlayerTab, updatePlayerList } from "../sidebar";
import { fetchPlayer } from "../player";
import { clearFraudPoints, fetchPlayerFraud, keepFraudPoints } from "./fraudTaskSlice";
import Component from "./Component";
import { RootState } from "js/rootReducer";

const Container = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const playerFraud = useSelector((state: RootState) => state.fraudTask.playerFraud);

  const playerId = Number(params.playerId);
  const playerFraudId = Number(params.playerFraudId);

  useEffect(() => {
    dispatch(fetchPlayerFraud({ playerId, playerFraudId }));
  }, [dispatch, playerId, playerFraudId]);

  const handleClear = useCallback(
    async (resolution?: string) => {
      if (resolution) {
        await dispatch(clearFraudPoints({ playerId, playerFraudId, resolution }));
      } else {
        await dispatch(clearFraudPoints({ playerId, playerFraudId }));
      }
      dispatch(changePlayerTab(playerId, "player-info"));
      dispatch(fetchPlayer(playerId));
      dispatch(updatePlayerList());
    },
    [dispatch, playerFraudId, playerId],
  );

  const handleKeep = useCallback(
    async (resolution?: string) => {
      if (resolution) {
        await dispatch(keepFraudPoints({ playerId, playerFraudId, resolution }));
      } else {
        await dispatch(keepFraudPoints({ playerId, playerFraudId }));
      }
      dispatch(changePlayerTab(playerId, "player-info"));
      dispatch(fetchPlayer(playerId));
      dispatch(updatePlayerList());
    },
    [dispatch, playerId, playerFraudId],
  );

  return <Component playerFraud={playerFraud} playerId={playerId} onClear={handleClear} onKeep={handleKeep} />;
};

export default Container;
