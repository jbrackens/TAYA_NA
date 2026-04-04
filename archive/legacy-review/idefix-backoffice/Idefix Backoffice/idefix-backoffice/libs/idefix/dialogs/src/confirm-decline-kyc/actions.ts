import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, sidebarSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const declineKyc =
  (playerId: number, documentId: number, formikHelpers: FormikHelpers<Record<string, unknown>>) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.kyc.decline(playerId, documentId);
      dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_DECLINE_KYC));
      dispatch(sidebarSlice.changePlayerTab(playerId, "player-info"));
    } catch (error) {
      formikHelpers.setFieldError("general", error.message);
    }
  };
