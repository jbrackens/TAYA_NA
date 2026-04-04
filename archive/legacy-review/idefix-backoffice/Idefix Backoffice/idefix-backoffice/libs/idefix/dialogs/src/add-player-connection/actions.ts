import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, dialogsSlice, addPlayerConnectionSlice, risksSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  playersIds: number[];
}

export const connectPlayers =
  ({ playerId, playersIds }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.addPlayerConnection(playerId, playersIds);
      dispatch(dialogsSlice.closeDialog(DIALOG.ADD_PLAYER_CONNECTION));
      dispatch(risksSlice.fetchConnectedPlayers(playerId));
    } catch (err) {
      dispatch(addPlayerConnectionSlice.playersError(err));
    }
  };
