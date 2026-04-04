/* @flow */
import type {
  AuthenticatedRequest,
  MessageCode,
  GetPlayerCurrencyRequest,
  GetBalanceRequest,
  WithdrawRequest,
  WithdrawAndDepositRequest,
  RollbackTransactionRequest,
  DepositRequest,
} from './types';

const isArray = require('lodash/fp/isArray');
const first = require('lodash/fp/first');
const find = require('lodash/find');
const { xmlEncode } = require('gstech-core/modules/soap');
const logger = require('gstech-core/modules/logger');
const { SHOW_MESSAGE_GAME_ROUND_CLOSE, ERROR_AUTHENTICATION_FAILED } = require('./types');
const NetEntOperations = require('./NetEntOperations');
const config = require('../../../config');

const configuration = config.providers.netent;

const returnSoapBody = (body: string) =>
  `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body>${body}</s:Body></s:Envelope>`;

const returnMessage = (messageCode: MessageCode, messageText: string) =>
  `<message><code>${messageCode}</code><message>${xmlEncode(messageText || '')}</message></message>`;

const returnSoapFault = (errorCode: string, detail: string) =>
  `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/">
      <soap:Body>
        <soap:Fault>
          <faultcode>soap:Server</faultcode>
          <faultstring>${errorCode}</faultstring>
          <detail>${detail}</detail>
        </soap:Fault>
      </soap:Body>
    </soap:Envelope>`;

const getBalance = async (body: GetBalanceRequest) => {
  const { balance } = await NetEntOperations.getBalance(body);
  return returnSoapBody(`<n:getBalanceResponse><balance>${balance}</balance></n:getBalanceResponse>`);
};

const getPlayerCurrency = async (body: GetPlayerCurrencyRequest) => {
  const { currencyIsoCode } = await NetEntOperations.getPlayerCurrency(body);
  return returnSoapBody(`<n:getPlayerCurrencyResponse><currencyIsoCode>${currencyIsoCode}</currencyIsoCode></n:getPlayerCurrencyResponse>`);
};

const withdraw = async (body: WithdrawRequest) => {
  try {
    const {
      balance,
      transactionId,
      message,
    } = await NetEntOperations.withdraw(body);
    if (message != null) {
      return returnMessage(SHOW_MESSAGE_GAME_ROUND_CLOSE, message);
    }
    return returnSoapBody(`<n:withdrawResponse><balance>${balance}</balance><transactionId>${transactionId}</transactionId></n:withdrawResponse>`);
  } catch (e) {
    if (e.code) {
      if (e.code === 1) {
        const { balance } = await NetEntOperations.getBalance(body);
        return returnSoapFault(e.code, `<n:withdrawFault><errorCode>${e.code}</errorCode><balance>${balance}</balance></n:withdrawFault>`);
      }
      return returnSoapFault(e.code, `<n:withdrawFault><errorCode>${e.code}</errorCode></n:withdrawFault>`);
    }
    throw e;
  }
};

const deposit = async (body: DepositRequest) => {
  try {
    const { balance, transactionId } = await NetEntOperations.deposit(body);
    return returnSoapBody(`<n:depositResponse><balance>${balance}</balance><transactionId>${transactionId}</transactionId></n:depositResponse>`);
  } catch (e) {
    if (e.code) {
      return returnSoapFault(e.code, `<n:depositFault><errorCode>${e.code}</errorCode></n:depositFault>`);
    }
    throw e;
  }
};

const withdrawAndDeposit = async (body: WithdrawAndDepositRequest) => {
  try {
    const { newBalance, transactionId } = await NetEntOperations.withdrawAndDeposit(body);
    return returnSoapBody(`<n:withdrawAndDepositResponse><newBalance>${newBalance}</newBalance><transactionId>${transactionId}</transactionId></n:withdrawAndDepositResponse>`);
  } catch (e) {
    if (e.code) {
      if (e.code === 1) {
        const { balance } = await NetEntOperations.getBalance(body);
        return returnSoapFault(e.code, `<n:withdrawAndDepositFault><errorCode>${e.code}</errorCode><balance>${balance}</balance></n:withdrawAndDepositFault>`);
      }
      return returnSoapFault(e.code, `<n:withdrawAndDepositFault><errorCode>${e.code}</errorCode></n:withdrawAndDepositFault>`);
    }
    throw e;
  }
};

const rollbackTransaction = async (body: RollbackTransactionRequest) => {
  try {
    await NetEntOperations.rollbackTransaction(body);
    return returnSoapBody('<n:rollbackTransactionResponse></n:rollbackTransactionResponse>');
  } catch (e) {
    return '';
  }
};

const endpoint = {
  getBalance,
  getPlayerCurrency,
  withdraw,
  deposit,
  withdrawAndDeposit,
  rollbackTransaction,
};

const parseParams = (input: any) => {
  const result: { [string]: any } = {};
  Object.entries(input).forEach(([key, value]: [string, any]) => {
    if (isArray(value)) {
      const v: any = value;
      result[key] = first(v);
    }
  });
  return result;
};

const validateRequest = (request: AuthenticatedRequest) => {
  const conf = find(configuration, c =>
    request.callerId === c.callerId && request.callerPassword === c.callerPassword);
  if (conf != null) {
    request.conf = conf; // eslint-disable-line no-param-reassign
    return true;
  }
  return false;
};

const WalletServer = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const query: any = req.body;
    logger.debug('WalletServer NetEnt', JSON.stringify(query));
    const Body = query.Envelope.Body[0];
    const operation = Object.keys(Body)[0];
    const params: any = parseParams(Body[operation][0]);
    // $FlowFixMe[invalid-computed-prop]
    const cb = endpoint[operation];
    if (cb) {
      res.type('text/xml; charset=utf-8');

      if (!validateRequest(params)) {
        return res.send(returnSoapBody(`<n:${operation}Fault><errorCode>${ERROR_AUTHENTICATION_FAILED}</errorCode><message>Authentication failed</message></n:${operation}Fault>`));
      }

      try {
        const response = await cb(params);
        logger.debug('WalletServer NetEnt', operation, response);
        return res.send(response);
      } catch (e) {
        logger.error('WalletServer failed', e);
        if (e.code != null) {
          return res.send(returnSoapBody(`<n:${operation}Fault><errorCode>${e.code}</errorCode><message>${e.message || ''}</message></n:${operation}Fault>`));
        }
        logger.warn('Invalid status returned for NetEnt', e);
        return res.status(500).send('');
      }
    }
    return res.status(404).end('Invalid operation');
  } catch (e) {
    logger.warn('Invalid NetEnt request', e);
    return res.status(500).send('Invalid request');
  }
};

module.exports = WalletServer;
