/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';

const crypto = require('crypto');
const { axios } = require('gstech-core/modules/axios');
const { PhoneNumberFormat: { NATIONAL }, PhoneNumberUtil } = require('google-libphonenumber');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');
const config = require('../../../config');

const configuration = config.providers.qpay;
const defaultKey = Buffer.from(configuration.defaultAesKey, 'base64');
const iv = Buffer.from(configuration.aesIV, 'utf8');

const phoneUtil = PhoneNumberUtil.getInstance();

const encrypt = (payload: Object, key: Buffer): string => {

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(payload, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return encrypted;
};

const decrypt = (encrypted: string, key: Buffer): string => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = decipher.update(encrypted, 'base64', 'utf8');
  return (decrypted + decipher.final('utf8'));
};

const versionCheck = async (): Promise<{ header: { key: string } }> => {
  const data = {
    header: {
      operatingSystem: 'android',
      sessionId: configuration.distributorId,
      version: '1.0.0',
    },
    transaction: {
      requestType: 'ONBO',
      requestSubType: 'CHECK',
      channel: 'WEB',
      tranCode: 0,
      txnAmt: 0.0,
    },
  };

  const payload = encrypt(JSON.stringify(data), defaultKey);
  const body = { payload, uId: 'CHECK' };

  logger.debug('versionCheck request:', { body, decrypted: data });
  const { data: response } = await axios.post(configuration.withdrawals.url, body);

  const result = JSON.parse(decrypt(response.payload, defaultKey));
  logger.debug('versionCheck response:', { response: result.response });

  return result;
};

const loadMoney = async (player: PlayerWithDetails, transactionId: string, ipAddress: IPAddress, userAgent: string, customKey: Buffer): Promise<any> => {
  const data = {
    header: {
      ipAddress,
      userAgent,
      operatingSystem: 'WEB',
      sessionId: configuration.distributorId,
      version: '1.0.0',
    },
    transaction: {
      requestType: 'WTW',
      requestSubType: 'LMREQ',
      id: configuration.distributorId,
    },
    loadMoneyModel: {
      txnAmount: 5000.0,
      txnId: transactionId,
      createdBy: configuration.distributorId,
      ipAddress,
      userAgent,
    },
  };

  const payload = encrypt(JSON.stringify(data), customKey);
  const body = { payload, uId: player.id };

  logger.debug('loadMoney request:', { body, decrypted: data });
  const { data: response } = await axios.post(configuration.withdrawals.url, body);

  const result = JSON.parse(decrypt(response.payload, customKey));
  logger.debug('loadMoney response:', { response: result.response });

  return result;
};

// TODO: remove if not needed
// const addBeneficiary = async (player: PlayerWithDetails, customKey: Buffer) => {
//   const data = {
//     header: {
//       operatingSystem: 'android',
//       sessionId: configuration.distributorId,
//       version: '1.0.0',
//     },
//     userInfo: {},
//     transaction: {
//       requestType: 'WTW',
//       requestSubType: 'BENEF',
//       tranCode: 0,
//       txnAmt: 0.0,
//     },
//     payOutBean: {
//       mobileNo: '9998887776', // player.mobilePhone,
//       accountNo: '119601523756',
//       ifscCode: 'ICIC0001196',
//       accountHolderName: 'ABC',
//       txnType: 'BANK', // VPA "nickName": "CFG"
//     },
//   };

//   const payload = encrypt(JSON.stringify(data), customKey);
//   const body = { payload, uId: player.id };

//   logger.debug('addBeneficiary request:', { body, decrypted: data });
//   const response = await request.post(configuration.withdrawals.url, {
//     json: true,
//     body,
//   });

//   const result = JSON.parse(decrypt(response.payload, customKey));
//   logger.debug('addBeneficiary response:', { response: result.response });

//   return result;
// };

// TODO: remove if not needed
// const payoutWithBeneficiary = async (player: PlayerWithDetails, amount: Money, ipAddress: IPAddress, userAgent: string, customKey: Buffer) => {
//   const data = {
//     header: {
//       ipAddress,
//       userAgent,
//       operatingSystem: 'WEB',
//       sessionId: configuration.distributorId,
//     },
//     transaction: {
//       requestType: 'WTW',
//       requestSubType: 'PBENE',
//       id: configuration.distributorId,
//     },
//     payOutBean: {
//       mobileNo: '7879455898',
//       txnAmount: money.asFloat(amount),
//       beneId: 'BENE001018',
//     },
//   };

//   const payload = encrypt(JSON.stringify(data), customKey);
//   const body = { payload, uId: player.id };

//   logger.debug('payoutWithBeneficiary request:', { body, decrypted: data });
//   const response = await request.post(configuration.withdrawals.url, {
//     json: true,
//     body,
//   });

//   const result = JSON.parse(decrypt(response.payload, customKey));
//   logger.debug('payoutWithBeneficiary response:', { response: result.response });

//   return result;
// };

const payoutWithoutBeneficiary = async (
  player: PlayerWithDetails,
  amount: Money,
  accountParameters: {
    accountNo: string,
    ifscCode: string,
    bankName: string,
    accountHolderName: string,
    txnType: string,
    accountType: string,
  },
  customKey: Buffer): Promise<{ transaction: { otp_ref_number: string }, response: { description: string } }> => {

  const {
    accountNo,
    ifscCode,
    bankName,
    accountHolderName,
    txnType,
    accountType,
  } = accountParameters;

  const numberProto = phoneUtil.parse(player.mobilePhone, player.countryId);
  const formattedPhone = phoneUtil.format(numberProto, NATIONAL).replace(/\s/g, '').slice(1);

  const data = {
    header: {
      operatingSystem: 'WEB',
    },
    transaction: {
      requestType: 'WTW',
      requestSubType: 'PYOUT',
    },
    payOutBean: {
      mobileNo: formattedPhone,
      txnAmount: money.asFloat(amount),
      accountNo,
      ifscCode,
      bankName,
      accountHolderName,
      txnType,
      accountType,
    },
  };

  const payload = encrypt(JSON.stringify(data), customKey);
  const body = { payload, uId: player.id };

  logger.debug('payoutWithoutBeneficiary request:', { body, decrypted: data });
  const { data: response } = await axios.post(configuration.withdrawals.url, body);

  const result = JSON.parse(decrypt(response.payload, customKey));
  logger.debug('payoutWithoutBeneficiary response:', { response: result.response });

  return result;
};

module.exports = {
  versionCheck,
  loadMoney,
  // addBeneficiary,
  // payoutWithBeneficiary,
  payoutWithoutBeneficiary,
};
