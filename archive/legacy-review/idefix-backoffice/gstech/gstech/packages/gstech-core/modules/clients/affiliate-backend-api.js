/* @flow */
const config = require('../config');
const request = require('../request')('affiliate-backend-api', config.api.affmoreServer.private);

// TODO: duplicates! this type definition must move to core at some point
export type GetAffiliatesResponse = {
  affiliates: {
    affiliateId: Id,
    affiliateName: string,
    affiliateEmail: string,
  }[],
};

export type PaymentMethodDetails = {
  bankAccountHolder?: string,
  bankIban?: string,
  bankBic?: string,
  bankClearingNumber?: string,
  bankName?: string,
  bankAddress?: string,
  bankPostCode?: string,
  bankCountry?: string,
  skrillAccount?: string,
  casinoAccountEmail?: string,
};

export type PaymentStatus = 'Nothing to confirm' | 'Needs confirmation' | 'Confirmed' | 'Paid';
export type PaymentMethod = 'banktransfer' | 'skrill' | 'casinoaccount';
export type CreditPaymentType = 'Commission' | 'Extra Commission' | 'Fixed fee' | 'CPA' | 'Manual';
export type DebitPaymentType = 'Payment' | 'Tax';
export type PaymentType = CreditPaymentType | DebitPaymentType;

export type GetAffiliatePaymentBalancesResponse = {
  affiliates: {
    items: {
      affiliateId: Id,
      invoiceId: ?Id,
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

export type ConfirmAffiliateInvoiceResponse = {
  invoiceId: Id,
  canConfirm: boolean,
  canMarkAsPaid: boolean,
};

const getAffiliates = (): Promise<GetAffiliatesResponse> =>
  request('GET', '/affiliates');

const getAffiliatePaymentBalances = (year: number, month: number): Promise<GetAffiliatePaymentBalancesResponse> =>
  request('GET', `/payments?year=${year}&month=${month}`);

const getAffiliatePaymentBalance = (affiliateId: Id, year: number, month: number): Promise<GetAffiliatePaymentBalanceResponse> =>
  request('GET', `/payments/${affiliateId}?year=${year}&month=${month}`);

const confirmAffiliateInvoice = (affiliateId: Id, year: number, month: number): Promise<ConfirmAffiliateInvoiceResponse> =>
  request('POST', `/payments/${affiliateId}/invoices?year=${year}&month=${month}`);

const markAffiliateInvoiceAsPaid = (affiliateId: Id, invoiceId: Id): Promise<OkResult> =>
  request('POST', `/payments/${affiliateId}/invoices/${invoiceId}`);

module.exports = {
  getAffiliates,
  getAffiliatePaymentBalances,
  getAffiliatePaymentBalance,
  confirmAffiliateInvoice,
  markAffiliateInvoiceAsPaid,
};
