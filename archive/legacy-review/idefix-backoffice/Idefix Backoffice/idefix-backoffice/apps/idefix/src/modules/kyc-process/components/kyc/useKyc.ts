import { useCallback, useMemo } from "react";
import { FormikHelpers } from "formik";
import { useParams } from "react-router-dom";

import { useAppDispatch, kycProcessSlice } from "@idefix-backoffice/idefix/store";
import { Kyc } from "@idefix-backoffice/idefix/types";

interface Params {
  document: Kyc | null;
}

export const useKyc = ({ document }: Params) => {
  const dispatch = useAppDispatch();
  const params = useParams<{ playerId: string; kycDocumentId: string }>();
  const playerId = Number(params.playerId);
  const documentId = Number(params.kycDocumentId);

  const handleKycSubmit = useCallback(
    ({ documentType, expiryDate, fields }: Kyc, formikHelpers: FormikHelpers<Kyc>) => {
      dispatch(
        kycProcessSlice.submitDocument({
          playerId,
          kycDocumentId: documentId,
          document: {
            type: documentType,
            expiryDate,
            kycChecked: document!.kycChecked,
            fields: fields ?? {}
          },
          formikActions: formikHelpers
        })
      );
    },
    [dispatch, document, documentId, playerId]
  );

  const handleEditImage = useCallback(
    (prevPhotoId: string, newImage: any, documentId: number) => {
      if (playerId) {
        dispatch(kycProcessSlice.editImage({ playerId, prevPhotoId, newImage, documentId }));
      }
    },
    [dispatch, playerId]
  );

  const initialValues = useMemo(
    () =>
      ({
        expiryDate: document?.expiryDate,
        fields: document?.fields,
        accountId: document?.accountId,
        documentType: document?.documentType
      } as Kyc),
    [document]
  );

  return { initialValues, handleKycSubmit, handleEditImage };
};
