import { RequestDocumentsFormValues } from "@idefix-backoffice/idefix/forms";
import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, playerSlice, accountStatusSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { KycRequestDraft, DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  requestData: KycRequestDraft;
  formikActions: FormikHelpers<RequestDocumentsFormValues>;
}

export const requestDocuments =
  ({ playerId, requestData, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.kyc.requestDocuments(playerId, requestData);
      dispatch(playerSlice.fetchPlayer(playerId));
      dispatch(accountStatusSlice.fetchAccountStatus(playerId));
      dispatch(dialogsSlice.closeDialog(DIALOG.REQUEST_DOCUMENTS));
    } catch (err) {
      formikActions.setFieldError("general", "Bad request. Try later");
    } finally {
      formikActions.setSubmitting(false);
    }
  };
