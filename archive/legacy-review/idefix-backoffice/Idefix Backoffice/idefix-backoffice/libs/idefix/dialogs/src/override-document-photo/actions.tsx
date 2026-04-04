import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, kycProcessSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const overrideDocumentPhoto =
  ({
    playerId,
    documentId,
    prevPhotoId,
    newPhotoId
  }: {
    playerId: number;
    documentId: number;
    prevPhotoId: number;
    newPhotoId: string;
  }) =>
  (dispatch: AppDispatch) =>
    Promise.all([
      api.kyc.updatePhoto(playerId, documentId, { photoId: newPhotoId }),
      api.photos.removePhoto(prevPhotoId)
    ]).then(() => {
      dispatch(dialogsSlice.closeDialog(DIALOG.OVERRIDE_DOCUMENT_PHOTO));
      dispatch(kycProcessSlice.fetchKycDocument({ playerId, documentId }));
    });
