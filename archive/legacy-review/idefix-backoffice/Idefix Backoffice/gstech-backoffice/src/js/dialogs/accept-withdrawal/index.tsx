import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";
import { AcceptWithdrawalForm } from "../../forms/accept-withdrawal";
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

const AcceptWithdrawalDialog: FC<Props> = ({ payload }) => {
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

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("accept-withdrawal")), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik initialValues={{}} onSubmit={handleSubmit}>
        {props => (
          <>
            <DialogTitle>Accept now</DialogTitle>
            <DialogContent>
              <AcceptWithdrawalForm />
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

export default AcceptWithdrawalDialog;
