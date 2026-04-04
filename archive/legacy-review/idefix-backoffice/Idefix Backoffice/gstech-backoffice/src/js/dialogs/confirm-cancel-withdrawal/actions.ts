import api from "../../core/api";
import { updatePlayerList, changePlayerTab } from "../../modules/sidebar";
import { fetchPlayer } from "../../modules/player";
import { closeDialog } from "../";
import { FormikHelpers } from "formik";
import { AppDispatch } from "../../../index";

interface Props {
  playerId: number;
  transactionKey: string;
  formActions: FormikHelpers<{}>;
}

export const cancelPaymentTransaction = ({ playerId, transactionKey, formActions }: Props) => async (
  dispatch: AppDispatch,
) => {
  try {
    await api.players.cancelPaymentTransaction(playerId, transactionKey);
    dispatch(closeDialog("confirm-cancel-withdrawal"));
    dispatch(updatePlayerList());
    dispatch(changePlayerTab(playerId, "player-info"));
    dispatch(fetchPlayer(playerId));
  } catch (error) {
    formActions.setFieldError("general", error.message);
  }
};
