import { DocumentType } from "./document";

export interface Kyc {
  id: number;
  status: string;
  documentType: DocumentType;
  type: string;
  expiryDate: string | Date;
  photoId: string | null;
  name: string;
  account: string | null;
  accountId: number | string | null;
  content: string | null;
  kycChecked: boolean;
  fields: Record<string, unknown> | null;
}

export interface KycRequest {
  id: number;
  status: string;
  documentType: DocumentType;
  type: string;
  expiryDate: string;
  photoId: number;
  name: string;
  account: string;
  accountId: number;
  content: string;
  fields: Record<string, unknown>;
  requestId: number;
  handle: string;
}

export interface KycRequestDraft {
  automatically: boolean;
  note: string;
  message: string;
  documents: {
    type: string;
    accountId: number;
  }[];
}

export interface KycDocument {
  id: number;
  playerId: number;
  accountId: number;
  type: string;
  status: string;
  expiryDate: string;
  name: string;
  content: string;
  photoId: number;
  createdAt: string;
  fields: Record<string, unknown>;
}

export interface Photo {
  id: string;
  name?: string;
  originalName?: string;
  formStatus: string;
}
