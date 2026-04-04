import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";
import { ConfirmCancelWithdrawalForm } from "../../forms/confirm-cancel-withdrawal";
import { closeDialog } from "../";
import { cancelPaymentTransaction } from "./actions";

interface Props {
  payload: {
    playerId: number;
    withdrawalId: string;
  };
  meta?: unknown;
}

const ConfirmCancelWithdrawalDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();

  const handleSubmit = useCallback(
    (_: unknown, formActions: FormikHelpers<{}>) => {
      const { playerId, withdrawalId } = payload || {};
      dispatch(cancelPaymentTransaction({ playerId, transactionKey: withdrawalId, formActions }));
    },
    [dispatch, payload],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("confirm-cancel-withdrawal")), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik initialValues={{}} onSubmit={handleSubmit}>
        {props => (
          <>
            <DialogTitle>Confirm</DialogTitle>
            <DialogContent>
              <ConfirmCancelWithdrawalForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" onClick={props.submitForm} disabled={props.isSubmitting} color="primary">
                Confirm
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default ConfirmCancelWithdrawalDialog;
