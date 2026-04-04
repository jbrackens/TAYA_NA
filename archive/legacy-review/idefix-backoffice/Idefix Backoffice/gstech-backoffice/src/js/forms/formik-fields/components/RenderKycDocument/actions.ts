import api from "../../../../core/api";

export const getDocument = (documentId: string) =>
  api.photos.getDocument(documentId).then(response => {
    const contentType = response.headers.get("content-type");
    const arrayBuffer = response.arrayBuffer();

    return Promise.all([contentType, arrayBuffer]);
  });
