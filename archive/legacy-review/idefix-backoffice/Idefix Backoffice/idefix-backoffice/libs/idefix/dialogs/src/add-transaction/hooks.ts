import { FormikHelpers } from "formik";
import { useEffect, useCallback, useMemo } from "react";

import { useAppDispatch, useAppSelector, transactionsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { AddTransactionFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { fetchAccounts, addTransaction } from "./actions";

const useAddTransaction = (playerId: number) => {
  const dispatch = useAppDispatch();
  const withdrawals = useAppSelector(transactionsSlice.getWithdrawals);

  useEffect(() => {
    dispatch(fetchAccounts(playerId));

    if (!withdrawals) {
      dispatch(transactionsSlice.fetchWithdrawals({ playerId }));
    }
  }, [dispatch, playerId, withdrawals]);

  const handleSubmit = useCallback(
    (
      { type, noFee = false, accountId, amount, reason }: AddTransactionFormValues,
      formikActions: FormikHelpers<AddTransactionFormValues>
    ) => {
      const transactionDraft =
        type === "withdraw"
          ? {
              type,
              noFee: !noFee,
              accountId,
              amount,
              reason
            }
          : {
              type,
              amount,
              reason
            };
      dispatch(addTransaction({ playerId, transactionDraft, formikActions }));
    },
    [dispatch, playerId]
  );

  const handleCloseDialog = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.ADD_TRANSACTION)), [dispatch]);

  const initialValues: AddTransactionFormValues = useMemo(
    () => ({ type: "compensation", amount: 0, reason: "", noFee: false }),
    []
  );

  return { handleSubmit, handleCloseDialog, initialValues, withdrawals };
};

export { useAddTransaction };
