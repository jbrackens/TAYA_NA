/* @flow */
export type INeteller = {
  consumerId: string,
  detail1Description?: string,
  detail1Text?: string,
};

export type IBillingDetails = {
  street: string,
  street2?: string,
  city: string,
  zip: string,
  country: string,
};

export type IGatewayResponse = {
  orderId: string,
  totalAmount: number,
  currency: string,
  status: string,
  lang: string,
  processor: string,
};

export type IReturnLinksItem = {
  rel: string,
  href: string,
};

export type ILinksItem = {
  rel: string,
  href: string,
};

export type CreatePaymentHandleRequest = {
  merchantRefNum: string,
  transactionType: 'PAYMENT' | 'STANDALONE_CREDIT',
  neteller?: INeteller,
  paymentType: '' | 'NETELLER',
  amount: number,
  currencyCode: string,
  customerIp: IPAddress,
  billingDetails: IBillingDetails,
  returnLinks: IReturnLinksItem[],
};

export type CreatePaymentHandleResponse = {
  id: string,
  paymentType: string,
  paymentHandleToken: string,
  merchantRefNum: string,
  currencyCode: string,
  dupCheck: boolean,
  status: string,
  liveMode: boolean,
  usage: string,
  action: string,
  executionMode: string,
  amount: number,
  billingDetails: IBillingDetails,
  customerIp: string,
  timeToLiveSeconds: number,
  gatewayResponse: IGatewayResponse,
  neteller: INeteller,
  returnLinks: IReturnLinksItem[],
  txnTime: string,
  updatedTime: string,
  statusTime: string,
  links: ILinksItem[],
};

export type ProcessPaymentRequest = {
  merchantRefNum: string,
  amount: number,
  currencyCode: string,
  dupCheck: boolean,
  settleWithAuth: boolean,
  paymentHandleToken: string,
  customerIp?: string,
  description?: string,
};

export type ProcessPaymentResponse = {
  id: string,
  amount: number,
  merchantRefNum: string,
  settleWithAuth: boolean,
  paymentHandleToken: string,
  txnTime: string,
  customerIp: string,
  dupCheck: boolean,
  description: string,
  currencyCode: string,
  paymentType: string,
  status: string,
  availableToSettle: number,
  gatewayResponse: IGatewayResponse,
  neteller?: INeteller,
};

export type ProcessStandaloneCreditsRequest = {
  amount: number,
  merchantRefNum: string,
  currencyCode: string,
  paymentHandleToken: string,
  customerIp?: string,
  description?: string,
};

export type ProcessStandaloneCreditsResponse = {
  id: string,
  amount: number,
  merchantRefNum: string,
  paymentHandleToken: string,
  customerIp: string,
  currencyCode: string,
  paymentType: string,
  status: string,
  description: string,
};

export type WebhookPayload = {
  accountId: string,
  id: string,
  merchantRefNum: string,
  amount: number,
  usage: string,
  executionMode: string,
  currencyCode: string,
  type: 'PAYMENT_HANDLE' | 'PAYMENT' | 'SETTLEMENT' | 'SA_CREDIT',
  status: 'PAYABLE' | 'HELD' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
  paymentType: string,
};
