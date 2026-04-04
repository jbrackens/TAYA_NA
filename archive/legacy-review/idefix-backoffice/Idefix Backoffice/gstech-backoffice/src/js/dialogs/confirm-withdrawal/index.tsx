import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";
import { ConfirmWithdrawalForm, validationSchema } from "../../forms/confirm-withdrawal";
import { closeDialog } from "../";
import { confirm } from "./actions";

interface FormValues {
  externalTransactionId: string;
}

interface Props {
  payload: {
    playerId: string;
    withdrawalId: string;
  };
  meta?: unknown;
}

const ConfirmWithdrawalDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();

  const handleSubmit = useCallback(
    ({ externalTransactionId }: FormValues, formActions: FormikHelpers<FormValues>) => {
      const { playerId, withdrawalId } = payload;
      dispatch(
        confirm({
          playerId: Number(playerId),
          withdrawalId,
          externalTransactionId,
        }),
      );
    },
    [dispatch, payload],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("confirm-withdrawal")), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik initialValues={{ externalTransactionId: "" }} onSubmit={handleSubmit} validationSchema={validationSchema}>
        {props => (
          <>
            <DialogTitle>Confirm stuck withdrawal</DialogTitle>
            <DialogContent style={{ width: "400px" }}>
              <ConfirmWithdrawalForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={props.submitForm}
                disabled={props.isSubmitting || !props.dirty || !props.isValid}
                color="primary"
              >
                Confirm
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default ConfirmWithdrawalDialog;
