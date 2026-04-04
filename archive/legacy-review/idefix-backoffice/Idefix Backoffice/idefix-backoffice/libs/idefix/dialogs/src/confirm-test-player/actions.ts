import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, playerDetailsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { AskForReasonFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  type: string;
  value: boolean;
  reason: string;
  formActions: FormikHelpers<AskForReasonFormValues>;
}

export const updateTestPlayer =
  ({ playerId, type, value, reason, formActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      const player = await api.players.update(playerId, { [type]: value, reason });
      dispatch(playerDetailsSlice.updatePlayerDetails(player));
      dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_TEST_PLAYER));
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
