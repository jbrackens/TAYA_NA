/* @flow */
type parsedMerchantRef = {
  transactionKey: string,
  brandId: BrandId,
  username: string,
  isPnp: boolean,
};
type pnpRegistrationParsedMerchantRef = $Diff<parsedMerchantRef, { username: string }>;

export type merchantReferenceParserFn = ((mRef: string) => Promise<parsedMerchantRef>) &
  ((mRef: string, { pnpRegistration: false }) => Promise<parsedMerchantRef>) &
  ((mRef: string, { pnpRegistration: true }) => Promise<pnpRegistrationParsedMerchantRef>);

export type BriteSessionCallbackBody = {
  merchantId: string,
  sessionId: string,
  sessionState: number,
};

export type BriteTransactionCallbackBody = {
  merchantId: string,
  transactionId: string,
  transactionState: number,
};

export type BriteCallbackBody = BriteSessionCallbackBody | BriteTransactionCallbackBody;

export type BriteCredentials = {
  accessToken: string,
  refreshToken?: string,
};

export type BriteBasicDepositResponse = {
  url: string,
  id: string,
  token: string,
};

export type BriteAuthSessionResponse = BriteBasicDepositResponse;

export type BriteApiWithdrawalResponse = {
  id: string,
  eta: number,
};

export type BriteCreateKycResponse = {
  id: string,
};
export type BriteBank = {
  id: string,
  name: string,
};

export type BriteBankDetails = {
  bankName: string,
  countryId: string,
  iban: string,
};

export type BriteBankAccountRef = {
  holder: string,
  iban: string,
  id: string,
};

export type BriteErrorResponse = {
  errorName: string,
  errorMessage: string,
  state: string,
};

export type BriteBankAccount = {
  ...BriteBankAccountRef,
  product: string,
  name: string,
  created: number,
  countryId: string,
  bban: string,
  bankId: string,
  currencyId: string,
  paymentAccount: boolean,
  balance: string,
};

export type BriteTransaction = {
  fromBankAccount: BriteBankDetails,
  toBankAccount: BriteBankDetails,
  created: number,
  type: number,
  toBankAccountId: string,
  fromBankAccountId: string,
  countryId: string,
  amount: number,
  sessionId: string,
  approved: number,
  currencyId: string,
  state: number,
  completed: number,
  settled: number,
  message: string,
  customerId: string,
  merchantReference: string,
  id: string,
  errorCode: string,
};

export type BriteSession = {
  currencyId: string,
  reference: string,
  created: number,
  ip: string,
  merchantReference: string,
  countryId: string,
  bankId: string,
  bankAccountId: string,
  bankIntegrationId: string,
  state: number,
  transactionId: string,
  bankAccount: BriteBankAccountRef,
  amount: number,
  customerId: string,
  type: number,
  id: string,
  bank: BriteBank,
  userAgent: string,
  errorCode: string,
};

export type BriteKycAddress = {
  city: string,
  postalCode: string,
  streetAddress: string,
  country: string,
};

export type BriteKyc = {
  firstname: string,
  created: number,
  dob: string,
  lastname: string,
  completed: number,
  errorMessage: string,
  countryId: string,
  state: number,
  ssn: string,
  address: BriteKycAddress,
  customerId: string,
  id: string,
  feeId: string,
};
