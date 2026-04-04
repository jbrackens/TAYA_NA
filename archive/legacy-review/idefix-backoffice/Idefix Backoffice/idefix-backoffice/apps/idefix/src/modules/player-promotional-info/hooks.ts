import { useParams } from "react-router-dom";
import { useCallback, useEffect, ChangeEvent } from "react";

import {
  useAppDispatch,
  playerInfoSlice,
  useAppSelector,
  playerSlice,
  playerDetailsSlice,
  appSlice,
  dialogsSlice
} from "@idefix-backoffice/idefix/store";
import { PlayerDraft } from "@idefix-backoffice/idefix/types";

export const usePlayerPromotionalInfo = () => {
  const dispatch = useAppDispatch();
  const activeLimits = useAppSelector(playerInfoSlice.getActiveLimits);
  const promotions = useAppSelector(playerDetailsSlice.getPromotions);
  const userRoles = useAppSelector(appSlice.getRoles);
  const player = useAppSelector(playerSlice.getPlayerInfo);
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);
  const isAccountClosed = player ? player.accountClosed || player.accountSuspended || player.gamblingProblem : false;
  const subTitle = activeLimits?.selfExclusion || isAccountClosed;

  const handleUpdatePromotionalInfo = useCallback(
    (type: keyof PlayerDraft) => (_e: ChangeEvent<HTMLInputElement>, value: boolean) => {
      if (type === "testPlayer") {
        dispatch(dialogsSlice.openDialog("confirm-test-player", { playerId, type, value }));
      } else {
        dispatch(playerInfoSlice.updatePromotionsSettings({ playerId, type, value }));
      }
    },
    [dispatch, playerId]
  );

  useEffect(() => {
    if (playerId) {
      dispatch(playerInfoSlice.fetchActiveLimits(playerId));
    }
  }, [dispatch, playerId]);

  return { handleUpdatePromotionalInfo, promotions, userRoles, subTitle };
};
