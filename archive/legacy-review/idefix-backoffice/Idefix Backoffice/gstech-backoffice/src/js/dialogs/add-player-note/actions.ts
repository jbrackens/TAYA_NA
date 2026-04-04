import api from "../../core/api";
import { closeDialog } from "../";
import { fetchEvents } from "../../modules/history-and-notes";
import { AppDispatch } from "../../../index";

interface Props {
  playerId: number;
  value: string;
}

export const addPlayerNote = ({ playerId, value }: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.players.createNote(playerId, value);
    dispatch(fetchEvents(playerId));
    dispatch(closeDialog("add-player-note"));
  } catch (err) {
    console.log(err);
  }
};
