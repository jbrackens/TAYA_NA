import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, playerSlice, sidebarSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  withdrawalId: string;
  paymentProviderId: number;
  amount: number;
  formActions: FormikHelpers<any>;
}

export const accept =
  ({ playerId, withdrawalId, paymentProviderId, amount, formActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.acceptWithdrawalWithDelay(playerId, withdrawalId, paymentProviderId, amount, {});
      dispatch(sidebarSlice.updatePlayerList());
      dispatch(sidebarSlice.changePlayerTab(playerId, "player-info"));
      dispatch(playerSlice.fetchPlayer(playerId));
      dispatch(dialogsSlice.closeDialog(DIALOG.ACCEPT_WD_WITH_DELAY));
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
