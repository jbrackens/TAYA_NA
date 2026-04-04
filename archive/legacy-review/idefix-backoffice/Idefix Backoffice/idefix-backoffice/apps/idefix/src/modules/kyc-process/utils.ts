import { Kyc } from "@idefix-backoffice/idefix/types";

export const mapDocuments = (documents: Kyc[]) =>
  documents.map(({ id, photoId, name, content, expiryDate, fields }) => ({
    id,
    photoId,
    name,
    content,
    expiryDate: expiryDate && new Date(expiryDate),
    fields,
  }));
