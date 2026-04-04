import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";
import { AcceptWithdrawalWithDelayForm } from "../../forms/accept-withdrawal-with-delay";
import { closeDialog } from "../";
import { accept } from "./actions";

interface Props {
  payload: {
    playerId: string;
    withdrawalId: string;
    paymentProviderId: number | null;
    amount: number;
  };
  meta?: unknown;
}

const AcceptWithdrawalWithDelayDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();

  const handleSubmit = useCallback(
    (_, formActions: FormikHelpers<any>) => {
      const { playerId, withdrawalId, paymentProviderId, amount } = payload || {};

      if (paymentProviderId != null) {
        dispatch(
          accept({
            playerId: Number(playerId),
            withdrawalId,
            paymentProviderId,
            amount,
            formActions,
          }),
        );
      }
    },
    [dispatch, payload],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("accept-withdrawal-with-delay")), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik initialValues={{}} onSubmit={handleSubmit}>
        {props => (
          <>
            <DialogTitle>Accept with delay</DialogTitle>
            <DialogContent>
              <AcceptWithdrawalWithDelayForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" onClick={props.submitForm} disabled={props.isSubmitting} color="primary">
                Accept
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default AcceptWithdrawalWithDelayDialog;
