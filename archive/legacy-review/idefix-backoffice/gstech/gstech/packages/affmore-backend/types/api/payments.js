// @flow
import type { PaymentMethod, PaymentMethodDetails } from '../repository/affiliates';
import type { PaymentType, CreditPaymentType } from '../repository/payments';
import type { UserWithRoles } from '../repository/auth';
import type { AffiliateLog } from "./logs";

export type CreateAffiliatePaymentRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
  payment: {
    type: CreditPaymentType,
    description: string,
    amount: Money,
  },
};

export type MarkAffiliateInvoiceAsPaidRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
    invoiceId: Id,
  },
};

export type GetAffiliateInvoicesAdminRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
};

export type GetAffiliateBalancesRequest = {
  session: {
    user: UserWithRoles,
  },
  query: {
    year: number, // these are mandatory but still in 'query' because of route collision
    month: number,
  },
};

export type PaymentStatus = 'Unconfirmed' | 'Confirmed' | 'Paid';

export type GetAffiliatePaymentBalancesResponse = {
  affiliates: {
    items: {
      affiliateId: Id,
      invoiceId: ?Id,
      invoiceNumber: ?string,
      name: string,
      contactName: string,
      countryId: CountryId,
      status: PaymentStatus,
      paymentMethod: PaymentMethod,
      paymentMethodDetails: PaymentMethodDetails,
      taxRate: number,
      openingBalance: Money,
      creditedAmount: Money,
      paidAmount: Money,
      closingBalance: Money,
      allowPayments: boolean,
      canConfirm: boolean,
      canMarkAsPaid: boolean,
      userId: ?Id,
      manager: ?string,
    }[],
    totals: {
      closingBalance: Money,
    },
    total: Money,
  },
};

export type GetAffiliatePaymentBalanceRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
  query: {
    year: number, // these are mandatory but still in 'query' because of route collision
    month: number,
  },
};

export type GetAffiliatePaymentBalanceResponse = {
  payments: {
    items: {
      description: string,
      type: PaymentType,
      amount: Money,
      tax: Money,
      taxRate: number,
      total: Money,
    }[],
    totals: {
      amount: Money,
      tax: Money,
      total: Money,
    },
    total: Money,
  },
};

export type GetAffiliatePaymentsResponse = {
  payments: {
    items: {
      paymentId: Id,
      transactionDate: Date,
      type: string,
      description: string,
      amount: Money,
    }[],
    totals: {
      amount: Money,
    },
    total: Money
  },
};

export type GetAffiliateInvoicesAdminResponse = {
  draft: {
    payments: {
      items: {
        paymentId: Id,
        transactionDate: Date,
        type: string,
        description: string,
        amount: Money,
        createdBy: string,
      }[],
      totals: {
        amount: Money,
      },
      total: Money
    },
    canConfirm: boolean,
  },
  invoices: {
    items: {
      invoiceId: Id,
      invoiceDate: Date,
      invoiceNumber: string,
      creditedAmount: Money,
      paidAmount: Money,
      createdBy: string,
      status: PaymentStatus,
      canMarkAsPaid: boolean,
    }[],
  },
};

export type ConfirmAffiliateInvoiceRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
};

export type ConfirmAffiliateInvoiceResponse = {
  invoiceId: Id,
  canConfirm: boolean,
  canMarkAsPaid: boolean,
};

export type GetAffiliateInvoiceDraftRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
};

export type GetAffiliateInvoiceDraftResponse = {
  company: {
    name: string,
    address1: string,
    address2: string,
    vatNumber: string,
  },
  affiliate: {
    name: string,
    address: ?string,
    vatNumber: ?string,
    paymentMethod: PaymentMethod,
    paymentMethodDetails: PaymentMethodDetails,
  },
  payments: {
    paymentId: Id,
    transactionDate: Date,
    createdBy: string,
    type: PaymentType,
    description: string,
    amount: Money,
    tax: Money,
    taxRate: number,
    total: Money,
  }[],
  totals: {
    creditAmount: Money,
    debitAmount: Money,
    amount: Money,
    tax: Money,
    total: Money,
  },
  note: string,
};


export type GetAffiliateInvoiceRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
    invoiceId: Id,
  },
};

export type GetAffiliateInvoiceResponse = {
  invoiceDate: Date,
  invoiceNumber: string,
  company: {
    name: string,
    address1: string,
    address2: string,
    vatNumber: string,
  },
  affiliate: {
    name: string,
    address: ?string,
    vatNumber: ?string,
    paymentMethod: PaymentMethod,
    paymentMethodDetails: PaymentMethodDetails,
  },
  payments: {
    paymentId: Id,
    transactionDate: Date,
    createdBy: string,
    type: PaymentType,
    description: string,
    amount: Money,
    tax: Money,
    taxRate: number,
    total: Money,
  }[],
  totals: {
    creditAmount: Money,
    debitAmount: Money,
    amount: Money,
    tax: Money,
    total: Money,
  },
  note: string,
  attachments?: string[],
};

export type CreateAffiliateInvoiceAttachmentRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
    invoiceId: Id,
  },
};

export type CreateAffiliateInvoiceAttachmentResponse = {
  log: AffiliateLog,
};
