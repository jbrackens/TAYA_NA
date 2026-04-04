import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, historyAndNotesSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  noteId: number;
}

export const archiveNote =
  ({ playerId, noteId }: Props) =>
  (dispatch: AppDispatch) => {
    api.players
      .archiveNote(playerId, noteId)
      .then(() => {
        dispatch(historyAndNotesSlice.fetchEvents(playerId));
        dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_ARCHIVATION_PLAYER_NOTE));
      })
      .catch(error => console.log(error));
  };
