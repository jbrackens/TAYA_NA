import { FormikHelpers } from "formik";
import api from "../../core/api";
import { AppDispatch } from "../../../index";
import { updatePlayerList, changePlayerTab } from "../../modules/sidebar";
import { fetchPlayer } from "../../modules/player";
import { closeDialog } from "../";

interface Props {
  playerId: number;
  withdrawalId: string;
  paymentProviderId: number;
  amount: number;
  formActions: FormikHelpers<any>;
}

export const accept = ({ playerId, withdrawalId, paymentProviderId, amount, formActions }: Props) => async (
  dispatch: AppDispatch,
) => {
  try {
    await api.players.acceptWithdrawal(playerId, withdrawalId, paymentProviderId, amount, {});
    dispatch(updatePlayerList());
    dispatch(changePlayerTab(playerId, "player-info"));
    dispatch(fetchPlayer(playerId));
    dispatch(closeDialog("accept-withdrawal"));
  } catch (error) {
    formActions.setFieldError("general", error.error.message);
  }
};
