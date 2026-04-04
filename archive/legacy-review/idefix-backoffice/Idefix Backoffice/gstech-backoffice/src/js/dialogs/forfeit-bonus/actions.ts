import api from "../../core/api";
import { refetchBonuses } from "../../modules/bonuses";
import { closeDialog } from "../";
import { AppDispatch } from "../../../index";

export const forfeitBonus = (playerId: number, bonusId: number) => async (dispatch: AppDispatch) => {
  try {
    await api.players.forfeitBonus(playerId, bonusId);
    dispatch(refetchBonuses(playerId));
    dispatch(closeDialog("forfeit-bonus"));
  } catch (err) {
    console.log(err, "err");
  }
};
