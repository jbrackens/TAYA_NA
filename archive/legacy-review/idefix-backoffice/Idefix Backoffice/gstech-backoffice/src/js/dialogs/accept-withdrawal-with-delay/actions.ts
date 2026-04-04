import api from "../../core/api";
import { updatePlayerList, changePlayerTab } from "../../modules/sidebar";
import { fetchPlayer } from "../../modules/player";
import { closeDialog } from "../";
import { AppDispatch } from "../../../index";
import { FormikHelpers } from "formik";

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
    await api.players.acceptWithdrawalWithDelay(playerId, withdrawalId, paymentProviderId, amount, {});
    dispatch(updatePlayerList());
    dispatch(changePlayerTab(playerId, "player-info"));
    dispatch(fetchPlayer(playerId));
    dispatch(closeDialog("accept-withdrawal-with-delay"));
  } catch (error) {
    formActions.setFieldError("general", error.message);
  }
};
