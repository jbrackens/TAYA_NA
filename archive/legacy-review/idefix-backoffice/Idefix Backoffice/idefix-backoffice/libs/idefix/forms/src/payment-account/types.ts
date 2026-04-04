import { AccountDocument, Kyc } from "@idefix-backoffice/idefix/types";
import { ACCOUNT_IDENTIFIER_LABEL } from "@idefix-backoffice/idefix/utils";

export type PaymentAccountFormValues = {
  method: keyof typeof ACCOUNT_IDENTIFIER_LABEL;
  account: string;
  kycChecked: boolean;
  parameters: {
    bic: string;
    accountType?: string;
    bankCode?: string;
    bankBranch?: string;
  };
  documents?: AccountDocument[];
};

export type KycProcessPaymentFormValues = {
  documents: (
    | Kyc
    | {
        id: number;
        photoId: string | null;
        name: string;
        content: string | null;
        expiryDate: "" | Date;
        fields: Record<string, unknown> | null;
      }
  )[];
  id: number;
  active: boolean;
  withdrawals: boolean;
  kycChecked: boolean;
  account: string;
  accountHolder: string;
  parameters: { bic?: string; accountType?: string; bankCode?: string; bankBranch?: string };
  method?: string;
};
