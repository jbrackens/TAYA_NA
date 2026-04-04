import React, { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { closeDialog } from "../";
import { addTransaction, fetchAccounts } from "./actions";
import { AddTransactionForm, validate } from "../../forms/add-transaction";
import { fetchWithdrawals, getWithdrawals } from "../../modules/transactions/transactionsSlice";
import { PlayerPaymentAccounts, TransactionType } from "app/types";

interface Props {
  payload: number;
  meta: PlayerPaymentAccounts;
}

export type FormValues = {
  type: TransactionType;
  amount: number;
  reason: string;
  noFee?: boolean;
  accountId?: number;
};

const AddTransactionDialog = ({ payload: playerId, meta }: Props) => {
  const dispatch = useDispatch();
  const withdrawals = useSelector(getWithdrawals);

  useEffect(() => {
    dispatch(fetchAccounts(playerId));

    if (!withdrawals) {
      dispatch(fetchWithdrawals({ playerId }));
    }
  }, [dispatch, playerId, withdrawals]);

  const handleSubmit = useCallback(
    ({ type, noFee = false, accountId, amount, reason }: FormValues, formikActions: FormikHelpers<FormValues>) => {
      const transactionDraft =
        type === "withdraw"
          ? {
              type,
              noFee: !noFee,
              accountId,
              amount,
              reason,
            }
          : {
              type,
              amount,
              reason,
            };
      dispatch(addTransaction({ playerId, transactionDraft, formikActions }));
    },
    [dispatch, playerId],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("add-transaction")), [dispatch]);

  const initialValues: FormValues = useMemo(() => ({ type: "compensation", amount: 0, reason: "", noFee: false }), []);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik onSubmit={handleSubmit} initialValues={initialValues} validate={validate}>
        {props => (
          <>
            <DialogTitle>Add transaction</DialogTitle>
            <DialogContent>
              {meta && <AddTransactionForm {...props} accounts={meta} withdrawals={withdrawals} />}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="primary">
                Cancel
              </Button>
              <Button
                onClick={props.submitForm}
                type="submit"
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
                color="primary"
              >
                Save
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default AddTransactionDialog;
