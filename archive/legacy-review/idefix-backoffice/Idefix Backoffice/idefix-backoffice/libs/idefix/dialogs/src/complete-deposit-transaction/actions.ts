import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, paymentsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { CompleteDepTransactFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  transactionKey: string;
  transactionId: string;
  reason: string;
  formActions: FormikHelpers<CompleteDepTransactFormValues>;
}

export const completeDepositTransaction =
  ({ playerId, transactionKey, transactionId, reason, formActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.completeDepositTransaction(playerId, transactionKey, {
        externalTransactionId: transactionId,
        reason
      });
      dispatch(paymentsSlice.fetchPaymentTransactions({ playerId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.COMPLETE_DEPOSIT_TRANSACTION));
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
