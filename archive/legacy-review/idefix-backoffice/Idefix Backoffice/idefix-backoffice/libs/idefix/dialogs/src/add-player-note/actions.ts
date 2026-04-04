import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, dialogsSlice, historyAndNotesSlice } from "@idefix-backoffice/idefix/store";

import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  value: string;
}

export const addPlayerNote =
  ({ playerId, value }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.createNote(playerId, value);
      dispatch(historyAndNotesSlice.fetchEvents(playerId));
      dispatch(dialogsSlice.closeDialog(DIALOG.ADD_PLAYER_NOTE));
    } catch (err) {
      console.log(err);
    }
  };
