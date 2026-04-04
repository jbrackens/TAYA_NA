import api from "../../core/api";
import { closeDialog } from "../";
import { fetchKycDocument } from "../../modules/kyc-process";
import { AppDispatch } from "index";

export const overrideDocumentPhoto = ({
  playerId,
  documentId,
  prevPhotoId,
  newPhotoId,
}: {
  playerId: number;
  documentId: number;
  prevPhotoId: number;
  newPhotoId: string;
}) => (dispatch: AppDispatch) =>
  Promise.all([
    api.kyc.updatePhoto(playerId, documentId, { photoId: newPhotoId }),
    api.photos.removePhoto(prevPhotoId),
  ]).then(() => {
    dispatch(closeDialog("override-document-photo"));
    dispatch(fetchKycDocument({ playerId, documentId }));
  });
