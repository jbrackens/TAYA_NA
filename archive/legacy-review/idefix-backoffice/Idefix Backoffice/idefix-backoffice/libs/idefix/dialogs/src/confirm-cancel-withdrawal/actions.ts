import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, sidebarSlice, playerSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  transactionKey: string;
  formActions: FormikHelpers<any>;
}

export const cancelPaymentTransaction =
  ({ playerId, transactionKey, formActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.cancelPaymentTransaction(playerId, transactionKey);
      dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_CANCEL_WD));
      dispatch(sidebarSlice.updatePlayerList());
      dispatch(sidebarSlice.changePlayerTab(playerId, "player-info"));
      dispatch(playerSlice.fetchPlayer(playerId));
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
