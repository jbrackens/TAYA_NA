import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, bonusesSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const forfeitBonus = (playerId: number, bonusId: number) => async (dispatch: AppDispatch) => {
  try {
    await api.players.forfeitBonus(playerId, bonusId);
    dispatch(bonusesSlice.fetchBonuses(playerId));
    dispatch(dialogsSlice.closeDialog(DIALOG.FORFEIT_BONUS));
  } catch (err) {
    console.log(err, "err");
  }
};
