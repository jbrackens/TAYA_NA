/* @flow */
const crypto = require('crypto');
const _ = require('lodash');
const qs = require('querystring');
const config = require('../../../config');

const sha256 = (s: string): string => crypto.createHash('sha256').update(s).digest('hex').toLowerCase();
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const eutellerConfig = config.providers.euteller;

const signedQuery = (p: {[string]: any}, fields: (string | [string])[], separator: string = '') => {
  const keys = _.keys(p).filter(k => p[k] != null);
  const added = [];

  const result: { ... }[] = [];
  const hash = [];

  _.forEach<string | [string], $Keys<typeof fields>, typeof fields>(
    fields,
    (k) => {
      if (_.isArray(k)) {
        hash.push(k[0]);
      } else if (typeof k === 'string') {
        // $FlowFixMe[invalid-computed-prop] - flow doesn't understand that k is a string
        result.push({ [k]: p[k] });
        hash.push(p[k]);
        added.push(k);
      }
    },
  );

  _.forEach<string, string, string[]>(
    keys.filter((f) => f.indexOf('addfield[') === 0),
    (k: string) => {
      result.push({ [k]: p[k] });
      hash.push(p[k]);
      added.push(k);
    },
  );

  _.forEach<string, string, string[]>(_.difference(keys, added), (k: string) => {
    result.push({ [k]: p[k] });
  });

  result.push({ security: sha256(hash.join(separator)) });
  return result.map(s => qs.stringify(s)).join('&');
};

const depositSignature = (p: {[string]: any}): string => signedQuery(p, [
  'orderid',
  'customer',
  [eutellerConfig.deposit.password],
  'amount',
  'end_user[login]',
  'end_user[category]',
  'end_user[device]',
  'successurl',
  'failedurl',
]);

const depositSiirtoSignature = (p: {[string]: any}): string => signedQuery(p, [
  'orderid',
  'customer',
  [eutellerConfig.deposit.password],
  'amount',
  'end_user[login]',
  'end_user[category]',
  'end_user[device]',
  'end_user[phoneNumber]',
]);

const withdrawSignature = (p: {[string]: any}): string => signedQuery(p, [
  'transactionid',
  'customer',
  'amount',
  'end_user[iban]',
  'end_user[login]',
  [eutellerConfig.withdraw.password],
], '&');

const signinSignature = (p: {[string]: any}): string => signedQuery(p, [
  'customer',
  [eutellerConfig.deposit.password],
  'successurl',
  'failedurl',
  'ipnurl',
]);

const withdrawalResultSignature = (p: {[string]: any}): string => sha256([
  p.data.customer,
  p.data.transactionid,
  p.response_timestamp,
  eutellerConfig.withdraw.password,
].filter(x => x != null).join(''));

const validateIpnMd5ResultSignature = (p: {[string]: any}): boolean => md5([
  p.orderid,
  'ipn',
  eutellerConfig.deposit.username,
  p.amount,
  eutellerConfig.deposit.password,
].filter(x => x != null).join('')) === p.security;

const validateIdentifyResultSignature = (p: {[string]: any}): boolean => sha256([
  p.orderid,
  p.status,
  p.ipn,
  p.eutellerId,
  p.kyc.Name,
  p.kyc.phoneNumber,
  p.kyc.Address,
  p.kyc.PostalCode,
  p.kyc.City,
  p.kyc.DateOfBirth,
  p.kyc.Email,
  p.customer,
  eutellerConfig.deposit.password,
].filter(x => x != null).join('')) === p.security;

const validateIpnSha256ResultSignature = (p: {[string]: any}): boolean => sha256([
  p.orderid,
  p.ipn,
  p.customer,
  p.amount,
  eutellerConfig.deposit.password,
].filter(x => x != null).join('')) === p.security;

const validateWithdrawResultSignature = (p: any): boolean =>
  sha256([
    p.data.status,
    p.data.customer,
    p.data.transactionid,
    p.request_timestamp,
    eutellerConfig.withdraw.password,
  ].join('&')) === p.security;

const validateDepositResultSignature = (p: any): boolean =>
  sha256([
    p.orderid,
    eutellerConfig.deposit.username,
    p.amount,
    p.end_user.login,
    p.end_user.category,
    eutellerConfig.deposit.password,
  ].join('')) === p.security;

const validateKYCResultSignature = (p: any): boolean =>
  sha256([
    p.method,
    p.customer,
    p.merchant_reference,
    p.last_update,
    p.kyc.account_owner,
    p.kyc.iban_hashed,
    p.kyc.iban_masked,
    eutellerConfig.merchant.password,
  ].join('')) === p.security;

const wdRequestSignature = (txKey: string, username: string): string => sha256([eutellerConfig.withdraw.password, txKey, username].join('&'));
const validateWdRequest = (params: any): boolean => wdRequestSignature(params.transactionKey, params.username) === params.signature;

module.exports = {
  sha256,
  md5,
  depositSignature,
  validateIpnSha256ResultSignature,
  validateIdentifyResultSignature,
  validateIpnMd5ResultSignature,
  withdrawalResultSignature,
  validateDepositResultSignature,
  validateWithdrawResultSignature,
  validateKYCResultSignature,
  withdrawSignature,
  wdRequestSignature,
  validateWdRequest,
  depositSiirtoSignature,
  signinSignature,
};
