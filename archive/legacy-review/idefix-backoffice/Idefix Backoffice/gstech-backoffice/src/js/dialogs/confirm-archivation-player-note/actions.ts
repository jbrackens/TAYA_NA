import api from "../../core/api";
import { fetchEvents } from "../../modules/history-and-notes";
import { closeDialog } from "../";
import { AppDispatch } from "../../../index";

interface Props {
  playerId: number;
  noteId: number;
}

export const archiveNote = ({ playerId, noteId }: Props) => (dispatch: AppDispatch) => {
  api.players
    .archiveNote(playerId, noteId)
    .then(() => {
      dispatch(fetchEvents(playerId));
      dispatch(closeDialog("confirm-archivation-player-note"));
    })
    .catch(error => console.log(error));
};
