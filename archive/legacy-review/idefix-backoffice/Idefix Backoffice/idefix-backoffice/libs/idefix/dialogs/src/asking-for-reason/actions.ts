import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, accountStatusSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  field: string;
  value: string;
  reason: string;
  formActions: FormikHelpers<{ reason: string }>;
}

export const updateRiskProfile =
  ({ playerId, field, value, reason, formActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      const accountStatus = await api.players.updateAccountStatus(playerId, {
        [field]: value,
        reason
      });
      dispatch(accountStatusSlice.updateAccountStatusSuccess(accountStatus));

      dispatch(dialogsSlice.closeDialog(DIALOG.ASKING_FOR_REASON));
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
