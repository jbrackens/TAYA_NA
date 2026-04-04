import { FormikHelpers } from "formik";
import { useEffect, useCallback, useMemo } from "react";

import { useAppDispatch, paymentsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { Kyc, DocumentDraft, DIALOG } from "@idefix-backoffice/idefix/types";

import { uploadNewDocument } from "./actions";

interface Payload {
  playerId: number;
  document: Kyc;
}

const useViewPlayerDocument = (payload: Payload) => {
  const dispatch = useAppDispatch();

  const { document, playerId } = payload;
  const { id } = document;

  useEffect(() => {
    dispatch(paymentsSlice.fetchPaymentAccounts(playerId));
  }, [dispatch, playerId]);

  const handleSubmit = useCallback(
    (
      { type, photoId, expiryDate, content, accountId, documentType, fields }: Kyc,
      formikActions: FormikHelpers<Kyc>
    ) => {
      const playerDocumentDraft = {
        photoId: type === "photo" && photoId ? photoId : null,
        expiryDate,
        fields: fields,
        content: type === "content" && content && content !== "" ? content : null,
        type: documentType,
        accountId: documentType === "payment_method" ? accountId : null
      } as unknown as DocumentDraft;

      dispatch(uploadNewDocument(playerId, id, playerDocumentDraft, formikActions));
    },
    [dispatch, playerId, id]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.VIEW_PLAYER_DOCUMENT)), [dispatch]);

  const initialValues: Kyc = useMemo(() => {
    return (
      payload && {
        ...payload.document,
        expiryDate: payload.document && payload.document.expiryDate && new Date(payload.document.expiryDate),
        fields: payload.document && payload.document.fields,
        content: payload.document && payload.document.content,
        type: payload.document && payload.document.content ? "content" : "photo",
        documentType: payload.document && payload.document.documentType,
        accountId: payload.document && payload.document.accountId
      }
    );
  }, [payload]);

  return { handleSubmit, handleClose, initialValues };
};

export { useViewPlayerDocument };
