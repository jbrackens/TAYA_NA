import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import Component from "./Component";
import { openDialog } from "../../dialogs/";
import { fetchQuestionnaires } from "../questionnaires";
import {
  fetchActiveLimits,
  fetchRegistrationInfo,
  fetchStickyNote,
  getPlayerInfoState,
  updatePromotionsSettings,
  updateStickyNote,
} from "./playerInfoSlice";
import { getPromotions } from "../player-details";
import { getPlayerInfo } from "../player";
import { getRoles } from "../app";
import { RootState } from "js/rootReducer";
import { PlayerDraft } from "app/types";

const Container = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const playerId = Number(params.playerId);
  const {
    isFetchingRegistrationInfo,
    registrationInfo,
    activeLimits,
    isFetchingStickyNote,
    isSavingStickyNote,
    stickyNote,
  } = useSelector(getPlayerInfoState);

  const player = useSelector(getPlayerInfo);
  const roles = useSelector(getRoles);
  const promotions = useSelector((state: RootState) => getPromotions(state, playerId));

  const isAccountClosed = player ? player.accountClosed || player.accountSuspended || player.gamblingProblem : false;

  useEffect(() => {
    dispatch(fetchRegistrationInfo(playerId));
    dispatch(fetchActiveLimits(playerId));
    dispatch(fetchQuestionnaires(playerId));
    dispatch(fetchStickyNote(playerId));
  }, [dispatch, playerId]);

  const handleToggle = useCallback(
    (type: keyof PlayerDraft) => (e: any, value: any) => {
      if (type === "testPlayer") {
        dispatch(openDialog("confirm-test-player", { playerId, type, value }));
      } else {
        dispatch(updatePromotionsSettings({ playerId, type, value }));
      }
    },
    [dispatch, playerId],
  );

  const handleUpdateStickyNote = useCallback(
    async (content: string) => {
      try {
        await dispatch(updateStickyNote({ playerId, content }));
        dispatch(fetchStickyNote(playerId));
      } catch (error) {
        console.log(error, "error");
      }
    },
    [dispatch, playerId],
  );

  return (
    <Component
      playerId={playerId}
      promotions={promotions}
      activeLimits={activeLimits!}
      registrationInfo={registrationInfo!}
      stickyNote={stickyNote!}
      isFetchingStickyNote={isFetchingStickyNote}
      isFetchingRegistrationInfo={isFetchingRegistrationInfo}
      isSavingStickyNote={isSavingStickyNote}
      onToggle={handleToggle}
      onUpdateStickyNote={handleUpdateStickyNote}
      isAccountClosed={isAccountClosed}
      roles={roles}
    />
  );
};

export default Container;
