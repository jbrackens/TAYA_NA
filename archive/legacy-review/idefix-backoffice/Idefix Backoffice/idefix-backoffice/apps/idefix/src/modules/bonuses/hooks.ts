import { useCallback, useEffect } from "react";
import {
  useAppDispatch,
  useAppSelector,
  bonusesSlice,
  playerInfoSlice,
  dialogsSlice
} from "@idefix-backoffice/idefix/store";
import { useParams } from "react-router-dom";
import { PlayerBonus, DIALOG } from "@idefix-backoffice/idefix/types";

export const useBonuses = () => {
  const dispatch = useAppDispatch();
  const bonuses = useAppSelector(bonusesSlice.getBonuses);
  const isLoadingBonuses = useAppSelector(bonusesSlice.getIsLoadingBonuses);
  const financialInfo = useAppSelector(playerInfoSlice.getPlayerFinancialInfo);
  const isLoadingFinancialInfo = useAppSelector(playerInfoSlice.getPlayerFinancialInfoIsLoading);
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);

  const handleForfeit = useCallback(
    (bonus: PlayerBonus) => {
      dispatch(dialogsSlice.openDialog(DIALOG.FORFEIT_BONUS, { playerId, bonus }));
    },
    [dispatch, playerId]
  );

  useEffect(() => {
    if (playerId) {
      dispatch(bonusesSlice.fetchBonuses(playerId));
      dispatch(playerInfoSlice.fetchFinancialInfo(playerId));
    }
  }, [dispatch, playerId]);

  return { bonuses, isLoadingBonuses, financialInfo, isLoadingFinancialInfo, handleForfeit };
};
