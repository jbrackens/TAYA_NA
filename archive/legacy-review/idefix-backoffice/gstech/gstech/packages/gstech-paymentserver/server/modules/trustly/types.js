/* @flow */
export type TrustlyMethod = 'account' | 'credit' | 'debit' | 'pending' | 'cancel';
export type TrustlyMode = 'standard' | 'pnp' | 'bank';

export type Trustly<T> = {
  method: TrustlyMethod,
  version: string,
  params: {
    data: T,
    uuid: string,
    signature: string,
  },
};

export type AccountRequest = {
  orderid: string,
  accountid: string,
  verified: string,
  attributes: {
    zipcode: string,
    clearinghouse: string,
    address: string,
    city: string,
    personid: string,
    lastdigits: string,
    bank: string,
    name: string,
    descriptor: string,
  },
  notificationid: string,
  messageid: string,
};

export type CreditRequest = {
  orderid: string,
  timestamp: string,
  amount: string,
  messageid: string,
  currency: string,
  enduserid: string,
  notificationid: string,
};

export type PendingRequest = {
  amount: string,
  currency: string,
  messageid: string,
  notificationid: string,
  enduserid: string,
  orderid: string,
  timestamp: string,
};

export type CancelRequest = {
  enduserid: string,
  timestamp: string,
  messageid: string,
  orderid: string,
  notificationid: string,
};

export type DebitRequest = {
  amount: number,
  currency: string,
  messageid: string,
  orderid: string,
  enduserid: string,
  notificationid: string,
  timestamp: string,
  attributes: {},
};

export type KYCRequest = {
  abort: string,
  abortmessage: string,
  kycentityid: string,
  notificationid: string,
  messageid: string,
  orderid: string,
  attributes: {
    street: string,
    country: string,
    firstname: string,
    lastname: string,
    city: string,
    dob: string,
    gender: string,
    zipcode: string,
    personid: string,
    amount: string,
    currency: string,
  },
};
