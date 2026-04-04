import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { PlayerPayment } from "app/types";
import { closeDialog } from "../";
import { editPaymentWagering } from "./actions";
import { EditPaymentWageringForm, validationSchema } from "../../forms/edit-payment-wagering";

export interface FormValues {
  counterTarget: string;
  counterValue: string;
  counterType: string;
  amount: string;
}

interface Props {
  payload: {
    playerId: number;
    payment: PlayerPayment;
  };
  meta?: unknown;
}

const EditPaymentWageringDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();

  const handleSubmit = useCallback(
    (values: FormValues, formActions: FormikHelpers<FormValues>) => {
      const {
        playerId,
        payment: { counterId },
      } = payload;
      const counterTarget = Math.round(Number(values.counterTarget) * 100);

      dispatch(
        editPaymentWagering({
          playerId,
          counterId,
          wageringRequirement: { wageringRequirement: counterTarget },
          formActions,
        }),
      );
    },
    [dispatch, payload],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("edit-payment-wagering")), [dispatch]);

  const initialValues = useMemo(
    () =>
      payload &&
      payload.payment && {
        counterTarget: Number(payload.payment.counterTarget / 100).toFixed(2),
        counterValue: Number(payload.payment.counterValue / 100).toFixed(2),
        counterType: payload.payment.counterType,
        amount: payload.payment.amount,
      },
    [payload],
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik onSubmit={handleSubmit} initialValues={initialValues} validationSchema={validationSchema}>
        {props => (
          <>
            <DialogTitle>Edit deposit wagering requirement</DialogTitle>
            <DialogContent>
              <EditPaymentWageringForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
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

export default EditPaymentWageringDialog;
