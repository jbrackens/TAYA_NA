import api from "../../core/api";
import { closeDialog } from "../";
import { fetchPaymentTransactions } from "../../modules/payments";
import { AppDispatch } from "../../../index";
import { FormikHelpers } from "formik";
import { FormValues } from "./index";

interface Props {
  playerId: number;
  counterId: number;
  wageringRequirement: {
    wageringRequirement: number;
    reason?: string;
  };
  formActions: FormikHelpers<FormValues>;
}

export const editPaymentWagering = ({
  playerId,
  counterId,
  wageringRequirement: { wageringRequirement },
  formActions,
}: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.players.editPaymentWagering(playerId, counterId, wageringRequirement);
    dispatch(fetchPaymentTransactions({ playerId }));
    dispatch(closeDialog("edit-payment-wagering"));
  } catch (error) {
    formActions.setFieldError("general", error.message);
  }
};
