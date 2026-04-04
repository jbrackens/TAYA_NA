/* @flow */

export type JetonPayMethod = 'CHECKOUT' | 'DIRECT' | 'QR' | 'JETGO';

export type JetonCustomerRequest = {
  body: {
    customer: string,
  },
  ...
};

export type JetonCustomerResponse = {
  firstName: string,
  lastName: string,
  dateOfBirth: string,
};

export type JetonCheckoutRequest = {
  body: {
    orderId: string,
    currency: string,
    amount: number,
    returnUrl: string,
    method: 'CHECKOUT',
    customer?: ?string,
    language?: string,
  },
};

export type JetonCheckoutResponse = {
  paymentId: number,
  orderId: string,
  checkout: string,
  qr: ?string,
  method: 'CHECKOUT',
};

export type JetonWalletPayoutRequest = {
  body: {
    orderId: string,
    currency: string,
    amount: number,
    customer: string,
    note?: string,
  },
};

export type JetonWalletPayoutResponse = {
  paymentId: number,
  orderId: string,
};

export type JetonGOPayRequest = {
  body: {
    orderId: string,
    currency: string,
    amount: number,
    returnUrl: string,
    method: 'JETGO',
    customer: ?string,
    language?: string
  },
  ...
};

export type JetonGOPayResponse = {
  paymentId: number,
  orderId: string,
  qr: string,
  method: 'JETGO',
  appPaymentLink: string,
};

export type JetonGOPayoutRequest = {
  body: {
    orderId: string,
    currency: string,
    amount: number,
    customer: string,
    type: 'JETGO',
    note?: string,
  },
  ...
};

export type JetonGOPayoutResponse = {
  paymentId: number,
  orderId: string,
};

export type JetonIPNRequest = {
  paymentId: number,
  orderId: string,
  type: 'PAY' | 'PAYOUT',
  customer: string,
  amount: number,
  currency: string,
  status: 'SUCCESS' | 'FAILED',
  message: string,
};
