import api from "@idefix-backoffice/idefix/api";

export const getDocument = (documentId: string) =>
  api.photos.getDocument(documentId).then((response: any) => {
    const contentType = response.headers.get("content-type");
    const arrayBuffer = response.arrayBuffer();

    return Promise.all([contentType, arrayBuffer]);
  });
