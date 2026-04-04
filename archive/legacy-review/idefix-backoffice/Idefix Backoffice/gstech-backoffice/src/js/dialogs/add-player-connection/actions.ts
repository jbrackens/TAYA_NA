import api from "../../core/api";
import { closeDialog } from "../";
import { playersError } from "../../modules/add-player-connection";
import { fetchConnectedPlayers } from "../../modules/risks";
import { AppDispatch } from "../../../index";

interface Props {
  playerId: number;
  playersIds: number[];
}

export const connectPlayers = ({ playerId, playersIds }: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.players.addPlayerConnection(playerId, playersIds);
    dispatch(closeDialog("add-player-connection"));
    dispatch(fetchConnectedPlayers(playerId));
  } catch (err) {
    dispatch(playersError(err));
  }
};
