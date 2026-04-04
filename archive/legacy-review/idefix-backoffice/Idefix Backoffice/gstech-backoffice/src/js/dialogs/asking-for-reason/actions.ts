import api from "../../core/api";
import { closeDialog } from "../";
import { updateAccountStatusSuccess } from "../../modules/account-status";
import { AppDispatch } from "../../../index";
import { FormikHelpers } from "formik";

interface Props {
  playerId: number;
  field: string;
  value: string;
  reason: string;
  formActions: FormikHelpers<{ reason: string }>;
}

export const updateRiskProfile = ({ playerId, field, value, reason, formActions }: Props) => async (
  dispatch: AppDispatch,
) => {
  try {
    const accountStatus = await api.players.updateAccountStatus(playerId, {
      [field]: value,
      reason,
    });
    dispatch(updateAccountStatusSuccess(accountStatus));

    dispatch(closeDialog("asking-for-reason"));
  } catch (error) {
    formActions.setFieldError("general", error.message);
  }
};
