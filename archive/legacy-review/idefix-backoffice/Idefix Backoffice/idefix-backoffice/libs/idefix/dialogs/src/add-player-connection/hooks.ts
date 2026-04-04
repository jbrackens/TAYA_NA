import { useCallback } from "react";

import {
  addPlayerConnectionSlice,
  dialogsSlice,
  useAppDispatch,
  useAppSelector
} from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { connectPlayers } from "./actions";

const useAddPlayerConnection = (playerId: number) => {
  const dispatch = useAppDispatch();
  const selectedPlayers = useAppSelector(addPlayerConnectionSlice.getSelectedPlayers);
  const error = useAppSelector(addPlayerConnectionSlice.getError);

  const handleSubmit = useCallback(() => {
    dispatch(connectPlayers({ playerId, playersIds: selectedPlayers }));
  }, [dispatch, playerId, selectedPlayers]);

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.ADD_PLAYER_CONNECTION)), [dispatch]);

  return { handleSubmit, handleClose, selectedPlayers, error };
};

export { useAddPlayerConnection };
