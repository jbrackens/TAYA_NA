import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import {
  AppDispatch,
  dialogsSlice,
  playerSlice,
  paymentsSlice,
  transactionsSlice,
  sidebarSlice
} from "@idefix-backoffice/idefix/store";
import { Transaction, DIALOG } from "@idefix-backoffice/idefix/types";
import { AddTransactionFormValues } from "@idefix-backoffice/idefix/forms";

export const fetchAccounts = (playerId: number) => async (dispatch: AppDispatch) => {
  const accounts = await api.players.getPaymentAccounts(playerId);
  dispatch(dialogsSlice.changeMeta(accounts));
};

interface Props {
  playerId: number;
  transactionDraft: Transaction;
  formikActions: FormikHelpers<AddTransactionFormValues>;
}

export const addTransaction =
  ({ playerId, transactionDraft, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.addTransaction(playerId, transactionDraft);
      dispatch(playerSlice.fetchPlayer(playerId));
      dispatch(paymentsSlice.fetchPaymentTransactions({ playerId }));
      dispatch(transactionsSlice.fetchTransactions({ playerId }));
      dispatch(sidebarSlice.updatePlayerList());
      dispatch(dialogsSlice.closeDialog(DIALOG.ADD_TRANSACTION));
    } catch (err) {
      formikActions.setFieldError("general", err.message);
    }
  };
