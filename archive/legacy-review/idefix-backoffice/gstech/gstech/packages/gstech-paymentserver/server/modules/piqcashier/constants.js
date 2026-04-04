// @flow

const voucherDepositMethods = ['VisaVoucherDeposit', 'GiftcardDeposit', 'WebRedirectDeposit'];
const regularDepositMethods = [
  'CreditcardDeposit',
  'BankDeposit',
  'AstroPayCardDeposit',
  'Pay4FunDeposit',
];
const depositMethods: string[] = [...voucherDepositMethods, ...regularDepositMethods];
const withdrawalMethods = [
  'CreditcardWithdrawal',
  'BankWithdrawal',
  'BankIBANWithdrawal',
  'InteracWithdrawal',
  'AstroPayBankWithdrawal',
  'AstroPayCardWithdrawal',
  'Pay4FunWithdrawal',
];
// Use PaymentIQ id on our side for these transactions. Otherwise use payment providers native id.
const usePaymentIQId = ['Interac', 'BamboraGa'];
/*
  <response>100</response>
  <statusCode>ERR_DECLINED_NO_FUNDS</statusCode>
  <response>110</response>
  <statusCode>ERR_DECLINED_BAD_REQUEST</statusCode>
  <response>200</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>201</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>202</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>203</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>204</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>205</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>250</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>300</response>
  <statusCode>ERR_NOT_AUTHENTICATED</statusCode>
  <response>400</response>
  <statusCode>ERR_DECLINED_BAD_REQUEST</statusCode>
  <response>500</response>
  <statusCode>ERR_MERCHANT_OUT_OF_SERVICE</statusCode>
*/
const errors = {
  SESSION_NOT_ACTIVE: { errCode: '110', errMsg: 'Session not active' },
  INVALID_USERID: { errCode: '400', errMsg: 'Invalid userId' },
  INVALID_CURRENCY: { errCode: '400', errMsg: 'Invalid currency' },
  DEPOSIT_NOT_ACTIVE: { errCode: '300', errMsg: 'Deposit not active' },
  UNSUPPORTED_METHOD: { errCode: '500', errMsg: 'Payment method not currently active' },
  WITHDRAWAL_NOT_ACTIVE: { errCode: '400', errMsg: 'Withdrawal not active' },
};

module.exports = {
  voucherDepositMethods,
  regularDepositMethods,
  usePaymentIQId,
  depositMethods,
  withdrawalMethods,
  errors,
};
