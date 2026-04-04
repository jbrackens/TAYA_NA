import { FetchApi, KycAPI } from "./types";
import { PREFIX } from "./";

export default (fetchApi: FetchApi): KycAPI => ({
  get: playerId => fetchApi(`${PREFIX}/player/${playerId}/kyc`),
  getDocument: (playerId, kycDocumentId) => fetchApi(`${PREFIX}/player/${playerId}/kyc/${kycDocumentId}`),
  create: (playerId, photos) =>
    fetchApi(`${PREFIX}/player/${playerId}/kyc`, {
      method: "post",
      body: JSON.stringify({ photos }),
    }),
  createContent: (playerId, content) =>
    fetchApi(`${PREFIX}/player/${playerId}/kyc/content`, {
      method: "post",
      body: JSON.stringify({ content }),
    }),
  verify: (playerId, kycDocumentId, document) =>
    fetchApi(`${PREFIX}/player/${playerId}/kyc/${kycDocumentId}/verify`, {
      method: "put",
      body: JSON.stringify(document),
    }),
  update: (playerId, documentId, documentDraft) =>
    fetchApi(`${PREFIX}/player/${playerId}/kyc/${documentId}`, {
      method: "put",
      body: JSON.stringify(documentDraft),
    }),
  decline: (playerId, documentId) =>
    fetchApi(`${PREFIX}/player/${playerId}/kyc/${documentId}`, {
      method: "delete",
    }),
  updatePhoto: (playerId, documentId, documentDraft) =>
    fetchApi(`${PREFIX}/player/${playerId}/kyc/photo/${documentId}`, {
      method: "put",
      body: JSON.stringify(documentDraft),
    }),
  requestDocuments: (playerId, requestDraft) =>
    fetchApi(`/api/v1/player/${playerId}/kyc/request`, {
      method: "post",
      body: JSON.stringify(requestDraft),
    }),
});
