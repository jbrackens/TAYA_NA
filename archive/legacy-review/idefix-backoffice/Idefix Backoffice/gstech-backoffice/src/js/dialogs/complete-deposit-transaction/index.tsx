import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Box from "@material-ui/core/Box";
import { closeDialog } from "../";
import { completeDepositTransaction } from "./actions";
import { CompleteDepositTransactionForm, validationSchema } from "../../forms/complete-deposit-transaction";

export interface FormValues {
  transactionId: string;
  reason: string;
}

interface Props {
  payload: {
    playerId: number;
    transactionId: string;
    transactionKey: string;
  };
  meta?: unknown;
}

const CompleteDepositTransaction: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const initialTransactionId = payload && payload.transactionId ? payload.transactionId : "";

  const handleSubmit = useCallback(
    ({ reason, transactionId }: FormValues, formActions: FormikHelpers<FormValues>) => {
      dispatch(
        completeDepositTransaction({
          playerId: payload.playerId,
          transactionKey: payload.transactionKey,
          transactionId,
          reason,
          formActions,
        }),
      );
    },
    [dispatch, payload],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("complete-deposit-transaction")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      transactionId: initialTransactionId,
      reason: "",
    }),
    [initialTransactionId],
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleCloseDialog}>
      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={validationSchema}>
        {props => (
          <>
            <DialogTitle>Complete Deposit Transaction</DialogTitle>
            <DialogContent>
              <Box minWidth={400} minHeight={200}>
                <CompleteDepositTransactionForm disableTransactionIdField={!!initialTransactionId} />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                color="primary"
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
              >
                Complete
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default CompleteDepositTransaction;
