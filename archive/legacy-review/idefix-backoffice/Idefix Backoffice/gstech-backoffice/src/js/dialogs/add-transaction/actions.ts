import api from "../../core/api";
import { FormikHelpers } from "formik";
import { fetchPlayer } from "../../modules/player";
import { closeDialog, changeMeta } from "../";
import { fetchPaymentTransactions } from "../../modules/payments";
import { fetchTransactions } from "../../modules/transactions/transactionsSlice";
import { updatePlayerList } from "../../modules/sidebar";
import { AppDispatch } from "../../../index";
import { FormValues } from "./";
import { Transaction } from "app/types";

export const fetchAccounts = (playerId: number) => async (dispatch: AppDispatch) => {
  const accounts = await api.players.getPaymentAccounts(playerId);
  dispatch(changeMeta(accounts));
};

interface Props {
  playerId: number;
  transactionDraft: Transaction;
  formikActions: FormikHelpers<FormValues>;
}

export const addTransaction = ({ playerId, transactionDraft, formikActions }: Props) => async (
  dispatch: AppDispatch,
) => {
  try {
    await api.players.addTransaction(playerId, transactionDraft);
    dispatch(fetchPlayer(playerId));
    dispatch(fetchPaymentTransactions({ playerId }));
    dispatch(fetchTransactions({ playerId }));
    dispatch(updatePlayerList());
    dispatch(closeDialog("add-transaction"));
  } catch (err) {
    formikActions.setFieldError("general", err.message);
  }
};
