import { TransactionType } from "@idefix-backoffice/idefix/types";

export type AddTransactionFormValues = {
  type: TransactionType;
  amount: number;
  reason: string;
  noFee?: boolean;
  accountId?: number;
};
