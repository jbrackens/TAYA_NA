import { useCallback, useMemo } from "react";
import { FormikHelpers } from "formik";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { PlayerPayment, DIALOG } from "@idefix-backoffice/idefix/types";
import { EditPaymentWageringFormValues } from "@idefix-backoffice/idefix/forms";

import { editPaymentWagering } from "./actions";

interface Payload {
  playerId: number;
  payment: PlayerPayment;
}

const useEditPaymentWagering = (payload: Payload) => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    (values: EditPaymentWageringFormValues, formActions: FormikHelpers<EditPaymentWageringFormValues>) => {
      const {
        playerId,
        payment: { counterId }
      } = payload;
      const counterTarget = Math.round(Number(values.counterTarget) * 100);

      dispatch(
        editPaymentWagering({
          playerId,
          counterId,
          wageringRequirement: { wageringRequirement: counterTarget },
          formActions
        })
      );
    },
    [dispatch, payload]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_PAYMENT_WAGERING)), [dispatch]);

  const initialValues = useMemo(
    () =>
      payload &&
      payload.payment && {
        counterTarget: Number(payload.payment.counterTarget / 100).toFixed(2),
        counterValue: Number(payload.payment.counterValue / 100).toFixed(2),
        counterType: payload.payment.counterType,
        amount: payload.payment.amount
      },
    [payload]
  );

  return { handleSubmit, handleClose, initialValues };
};

export { useEditPaymentWagering };
