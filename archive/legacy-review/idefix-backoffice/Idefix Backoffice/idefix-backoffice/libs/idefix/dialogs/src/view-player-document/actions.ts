import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, documentsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DocumentDraft, Kyc, DIALOG } from "@idefix-backoffice/idefix/types";

export const uploadNewDocument =
  (playerId: number, documentId: number, documentDraft: DocumentDraft, formikActions: FormikHelpers<Kyc>) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.kyc.update(playerId, documentId, documentDraft);
      dispatch(documentsSlice.fetchKycDocuments(playerId));
      dispatch(dialogsSlice.closeDialog(DIALOG.VIEW_PLAYER_DOCUMENT));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };
