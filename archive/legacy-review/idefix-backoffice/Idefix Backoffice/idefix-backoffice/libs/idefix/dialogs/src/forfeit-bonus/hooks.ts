import { useCallback } from "react";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { PlayerBonus, DIALOG } from "@idefix-backoffice/idefix/types";

import { forfeitBonus } from "./actions";

interface Payload {
  playerId: number;
  bonus: PlayerBonus;
}

const useForfeitBonus = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const { playerId, bonus } = payload;

  const handleSubmit = useCallback(() => dispatch(forfeitBonus(playerId, bonus.id)), [bonus, dispatch, playerId]);
  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.FORFEIT_BONUS)), [dispatch]);

  return { handleSubmit, handleClose };
};

export { useForfeitBonus };
