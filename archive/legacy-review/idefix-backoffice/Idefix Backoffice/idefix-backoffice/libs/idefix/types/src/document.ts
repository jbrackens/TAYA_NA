export type DocumentType = "other" | "utility_bill" | "identification" | "payment_method" | "source_of_wealth";

export interface DocumentBase {
  type: DocumentType;
  expiryDate: string | Date;
  accountId?: number | string | null;
  kycChecked: boolean;
  content?: string | null;
  fields: Record<string, unknown>;
}

export interface DocumentDraft extends Partial<DocumentBase> {
  photoId: string | null;
  name?: string;
}

export interface AccountDocument {
  id: number;
  photoId: string;
  name: string;
  originalName?: string;
  expiryDate: string | Date | null;
  content: string | null;
  formStatus?: string;
}
