/* @flow */

export type Invoice = {
  id: Id,
  affiliateId: Id,
  invoiceNumber: string,
  month: number,
  year: number,
  isPaid: boolean,
  createdBy: Id,
  createdAt: Date,
  updatedAt: Date,
};

export type InvoiceWithAmounts = {
  ...Invoice,
  creditedAmount: Money,
  paidAmount: Money,
};
