import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, paymentsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  withdrawalId: string;
  externalTransactionId: string;
}

export const confirm =
  ({ playerId, withdrawalId, externalTransactionId }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.confirmWithdrawal(playerId, withdrawalId, externalTransactionId);
      dispatch(paymentsSlice.fetchPaymentTransactions({ playerId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_WD));
    } catch (e) {
      console.log(e);
    }
  };
