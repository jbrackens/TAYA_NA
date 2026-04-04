// @flow
import type { PaymentMethod, PaymentMethodDetails } from './affiliates';

export type CreditPaymentType = 'Commission' | 'Extra Commission' | 'Fixed fee' | 'CPA' | 'Manual';
export type DebitPaymentType = 'Payment' | 'Tax';
export type PaymentType = CreditPaymentType | DebitPaymentType;

export type PaymentDraft = {
  affiliateId: Id,
  invoiceId?: ?Id,
  transactionId: string,
  transactionDate: Date,
  month: number,
  year: number,
  type: PaymentType,
  description: string,
  amount: Money,
};

export type Payment = {
  id: Id,
  ...PaymentDraft,

  createdBy: Id,
};

export type PaymentBalance = {
  id: Id, // TODO: this is affiliateId. maybe worth renaming
  invoiceId: ?Id,
  invoiceNumber: ?string,
  name: string,
  contactName: string,
  countryId: CountryId,
  paymentMethod: PaymentMethod,
  paymentMethodDetails: PaymentMethodDetails,
  paymentMinAmount: Money,
  openingBalance: Money,
  creditedAmount: Money,
  paidAmount: Money,
  closingBalance: Money,
  allowPayments: boolean,
  userId: ?Id,
  isPaid: boolean,
};
