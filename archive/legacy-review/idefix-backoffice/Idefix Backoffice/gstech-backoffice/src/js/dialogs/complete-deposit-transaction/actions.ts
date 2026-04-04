import api from "../../core/api";
import { fetchPaymentTransactions } from "../../modules/payments";
import { closeDialog } from "../";
import { FormikHelpers } from "formik";
import { FormValues } from "./index";
import { AppDispatch } from "../../../index";

interface Props {
  playerId: number;
  transactionKey: string;
  transactionId: string;
  reason: string;
  formActions: FormikHelpers<FormValues>;
}

export const completeDepositTransaction = ({
  playerId,
  transactionKey,
  transactionId,
  reason,
  formActions,
}: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.players.completeDepositTransaction(playerId, transactionKey, {
      externalTransactionId: transactionId,
      reason,
    });
    dispatch(fetchPaymentTransactions({ playerId }));
    dispatch(closeDialog("complete-deposit-transaction"));
  } catch (error) {
    formActions.setFieldError("general", error.message);
  }
};
