import { useCallback, useEffect, useState } from "react";

import api from "@idefix-backoffice/idefix/api";
import { Kyc, DIALOG } from "@idefix-backoffice/idefix/types";
import { getBase64FromPDF, getObjectUrlFromArrayBuffer, getValidContentType } from "@idefix-backoffice/idefix/utils";
import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";

export const useRenderDocument = (document: Kyc) => {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<unknown>(null);
  const [href, setHref] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);

  const handleOpenFullSize = useCallback(
    (document: unknown) => () => {
      dispatch(dialogsSlice.openDialog(DIALOG.FULL_SIZE_IMAGE, { source: document }));
    },
    [dispatch]
  );

  useEffect(() => {
    async function fetchDocument(documentId: string) {
      try {
        const response = await api.photos.getDocument(documentId);
        const contentType = response.headers.get("content-type") as string;
        const arrayBuffer = (await response.arrayBuffer()) as ArrayBuffer;

        setContentType(contentType);

        if (contentType === "image/jpeg" || contentType === "image/png") {
          const imageUrl = getObjectUrlFromArrayBuffer(arrayBuffer, contentType);
          setData(imageUrl);
          return;
        }

        if (contentType === "application/pdf") {
          const pdf = await getBase64FromPDF(arrayBuffer, document.name);
          setData(pdf);
          return;
        }

        const validContentType = getValidContentType(document.name, contentType);
        const objectUrl = getObjectUrlFromArrayBuffer(arrayBuffer, validContentType);
        setData(null);
        setHref(objectUrl);
        return;
      } catch (e) {
        setData(null);
        setHref(null);
        console.log(e);
      } finally {
        setIsLoading(false);
      }
    }

    if (document.photoId) {
      fetchDocument(document.photoId);
    }
  }, [document.name, document.photoId]);

  return { isLoading, data, href, contentType, handleOpenFullSize };
};
