import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, rewardsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { MarkAsUsedFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  groupId: number;
  values: MarkAsUsedFormValues;
  formikActions: FormikHelpers<MarkAsUsedFormValues>;
}

export const confirmMarkAsUsed =
  ({ playerId, groupId, values, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.markRewardUsed(playerId, groupId, values);
      dispatch(rewardsSlice.fetchPlayerLedgers({ playerId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_MARK_AS_USED));
    } catch (error) {
      rewardsSlice.fetchPlayerLedgersError(error.message);
      formikActions.setFieldError("general", error.message);
    }
  };
