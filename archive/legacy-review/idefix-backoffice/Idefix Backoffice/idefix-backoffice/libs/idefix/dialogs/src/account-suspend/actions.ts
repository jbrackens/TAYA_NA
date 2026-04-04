import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { SuspendReason, DIALOG } from "@idefix-backoffice/idefix/types";
import { AppDispatch, accountStatusSlice, sidebarSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { AccountSuspendFormValues } from "@idefix-backoffice/idefix/forms";

interface Props {
  playerId: number;
  reasons: SuspendReason[];
  note: string;
  accountClosed: boolean;
  formikActions: FormikHelpers<AccountSuspendFormValues>;
}

export const proceed =
  ({ playerId, reasons, note, accountClosed, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.suspendAccount(playerId, reasons, note, accountClosed);
      dispatch(accountStatusSlice.fetchAccountStatus(playerId));
      dispatch(sidebarSlice.updatePlayerList());
      dispatch(dialogsSlice.closeDialog(DIALOG.ACCOUNT_SUSPEND));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };
