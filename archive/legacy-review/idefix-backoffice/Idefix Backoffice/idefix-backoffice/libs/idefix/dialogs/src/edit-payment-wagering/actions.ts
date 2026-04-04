import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, paymentsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { EditPaymentWageringFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  counterId: number;
  wageringRequirement: {
    wageringRequirement: number;
    reason?: string;
  };
  formActions: FormikHelpers<EditPaymentWageringFormValues>;
}

export const editPaymentWagering =
  ({ playerId, counterId, wageringRequirement: { wageringRequirement }, formActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.editPaymentWagering(playerId, counterId, wageringRequirement);
      dispatch(paymentsSlice.fetchPaymentTransactions({ playerId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_PAYMENT_WAGERING));
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
