import api from "../../core/api";
import { closeDialog } from "../";
import { fetchKycDocuments } from "../../modules/documents";
import { DocumentDraft, Kyc } from "app/types";
import { FormikHelpers } from "formik";
import { AppDispatch } from "index";

export const uploadNewDocument = (
  playerId: number,
  documentId: number,
  documentDraft: DocumentDraft,
  formikActions: FormikHelpers<Kyc>,
) => async (dispatch: AppDispatch) => {
  try {
    await api.kyc.update(playerId, documentId, documentDraft);
    dispatch(fetchKycDocuments(playerId));
    dispatch(closeDialog("view-player-document"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};
