import api from "../../core/api";
import { AppDispatch } from "../../../index";
import { closeDialog } from "../";
import { fetchPaymentTransactions } from "../../modules/payments";

interface Props {
  playerId: number;
  withdrawalId: string;
  externalTransactionId: string;
}

export const confirm = ({ playerId, withdrawalId, externalTransactionId }: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.players.confirmWithdrawal(playerId, withdrawalId, externalTransactionId);
    dispatch(fetchPaymentTransactions({ playerId }));
    dispatch(closeDialog("confirm-withdrawal"));
  } catch (e) {
    console.log(e);
  }
};
