/* @flow */
import type {

} from './types';

const joi = require('joi');
const { Router } = require('express');
const { xmlEncode } = require('gstech-core/modules/soap');
const logger = require('gstech-core/modules/logger');
const WilliamsOperations = require('./WilliamsOperations');

const router: express$Router<> = Router();  

const wrapResponse = (type: string, xml: string) => {
  const response = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <${type}
    xmlns:ns2="http://williamsinteractive.com/integration/vanilla/api/common"
    xmlns:ns3="http://williamsinteractive.com/integration/vanilla/api/player"
    xmlns:ns4="http://williamsinteractive.com/integration/vanilla/api/transaction">${xml}</${type}>`;
  logger.debug('WMS response', response);
  return response;
};

const validate = (
  body: mixed,
  schema: Joi$Schema<>,
  options: {} = {},
): any =>
  new Promise((resolve, reject) => {
    const validationResult = schema.validate(body, { ...options, stripUnknown: true });
    if (validationResult.error) {
      const err: any = Error(validationResult.error.details.map((d) => d.message).join(', '));
      logger.debug('Validation failed', validationResult.error, body);
      err.isJoi = true;
      return reject(err); // eslint-disable-line no-promise-executor-return
    }
    return resolve(validationResult.value); // eslint-disable-line no-promise-executor-return
  });

const playerAuthenticateSchema = joi.object({
  accountRef: joi.string().trim().required(),
  context: joi.string().trim().required(),
  gameCode: joi.string().trim().required(),
  ticket: joi.string().trim().required(),
  brand: joi.string().trim().optional(),
  partnerParameters: joi.string().trim().optional(),
}).required();

router.post('/player/authenticate', async (req: express$Request, res: express$Response) => {
  try {
    const { body } = req;
    const value = await validate(body.playerAuthentication, playerAuthenticateSchema);
    const { accountRef, balance, currency, language, result, userName } = await WilliamsOperations.authenticate(value);
    return res.type('text/xml').send(wrapResponse(
      'ns3:playerAuthenticationResponse',
      `<accountRef>${xmlEncode(accountRef)}</accountRef><currency>${xmlEncode(currency)}</currency><language>${xmlEncode(language)}</language><balance>${balance}</balance><userName>${xmlEncode(userName)}</userName><result>${xmlEncode(result)}</result>`,
    ));
    // <ns3:playerAuthenticationResponse xmlns:ns3="http://williamsinteractive.com/integration/vanilla/api/player"><accountRef>163972</accountRef><currency>EUR</currency><language>en_GB</language><balance>0</balance><userName>Oko.Ko_1437897215690</userName><result>SUCCESS</result></ns3:playerAuthenticationResponse>%
    // ${replacementTicket != null ? `<replacementTicket>${xmlEncode(replacementTicket)}</replacementTicket>` : ''}
  } catch (e) {
    if (!e.isJoi) {
      logger.warn('authenticate', e);
    }
    return res.type('text/xml').send(wrapResponse('ns3:playerAuthenticationResponse', '<result>FAILURE</result>'));
  }
});

const transferToGameSchema = joi.object({
  accountRef: joi.string().trim().required(),
  amount: joi.number().min(0).required(),
  context: joi.string().trim().required(),
  currency: joi.string().trim().required(),
  gameCode: joi.string().trim().required(),
  gameRoundId: joi.string().trim().required(),
  timestamp: joi.date().iso().required(),
  transactionId: joi.string().trim().required(),
  jackpotContributions: joi.object(),
  promoAmount: joi.number().min(0),
  ticket: joi.string().trim().allow(''), // not required because of Williams test suite
}).required();

router.post('/transaction/transferToGame', async (req: express$Request, res: express$Response) => {
  try {
    const { body } = req;
    const value = await validate(body.transferToGame, transferToGameSchema);
    try {
      const { balance, message, partnerTransactionRef, result } = await WilliamsOperations.transferToGame(value);
      return res.type('text/xml').send(wrapResponse(
        'ns4:transferToGameResponse',
        `<balance>${balance}</balance>
         <message>${xmlEncode(message)}</message>
        <partnerTransactionRef>${xmlEncode(partnerTransactionRef)}</partnerTransactionRef>
        <result>${xmlEncode(result)}</result>`,
      ));
    } catch (ex) {
      const { balance: newBalance } = await WilliamsOperations.getBalance(value, false);
      return res.type('text/xml').send(wrapResponse('ns4:transferToGameResponse', `<reconcile>false</reconcile><balance>${newBalance}</balance><result>FAILURE</result>`));
    }
  } catch (e) {
    if (!e.isJoi) {
      logger.warn('transferToGame', e);
    }
    return res.type('text/xml').send(wrapResponse('ns4:transferToGameResponse', '<result>FAILURE</result>'));
  }
});

const transferFromGameSchema = joi.object({
  accountRef: joi.string().trim().required(),
  amount: joi.number().min(0).required(),
  context: joi.string().trim().required(),
  currency: joi.string().trim().required(),
  gameCode: joi.string().trim().required(),
  gameRoundId: joi.string().trim().required(),
  timestamp: joi.date().iso().required(),
  transactionId: joi.string().trim().required(),
  jackpotContributions: joi.object(),
  promoAmount: joi.number().min(0),
}).required();

router.post('/transaction/transferFromGame', async (req: express$Request, res: express$Response) => {
  try {
    const { body } = req;
    const value = await validate(body.transferFromGame, transferFromGameSchema);
    try {
      const { balance, message, partnerTransactionRef, result } = await WilliamsOperations.transferFromGame(value);
      return res.type('text/xml').send(wrapResponse(
        'ns4:transferFromGameResponse',
        `<balance>${balance}</balance>
         <message>${xmlEncode(message)}</message>
         <partnerTransactionRef>${xmlEncode(partnerTransactionRef)}</partnerTransactionRef>
         <result>${xmlEncode(result)}</result>`,
      ));
    } catch (ex) {
      if (ex.code && ex.code === 10006) {
        const { balance } = await WilliamsOperations.getBalance(value, false);
        return res.type('text/xml').send(wrapResponse('ns4:transferFromGameResponse',
          `<balance>${balance}</balance>
          <result>FAILURE</result>
          <message>Not enough money</message>
          <requiredDisplayTime>DIRECT</requiredDisplayTime>
          <requiredUserAction>EXIT</requiredUserAction>
          <reconcile>false</reconcile>`));
      }
      if (ex.code && ex.code === 10008) {
        const { balance } = await WilliamsOperations.getBalance(value, false);
        return res.type('text/xml').send(wrapResponse('ns4:transferFromGameResponse',
          `<balance>${balance}</balance>
           <result>FAILURE</result>
           <message>Limit exceeded</message>
           <requiredDisplayTime>DIRECT</requiredDisplayTime>
           <requiredUserAction>EXIT</requiredUserAction>
           <reconcile>false</reconcile>`));
      }
    }
  } catch (e) {
    if (!e.isJoi) {
      logger.warn('transferFromGame', e);
    }
  }
  return res.type('text/xml').send(wrapResponse('ns4:transferFromGameResponse', '<result>FAILURE</result>'));
});

const cancelTransferToGameSchema = joi.object({
  accountRef: joi.string().trim().required(),
  gameRoundId: joi.string().trim().required(),
  transactionId: joi.string().trim().required(),
  canceledTransactionId: joi.string().trim().required(),
  amount: joi.number().min(0).required(),
  currency: joi.string().trim().required(),
  timestamp: joi.date().iso().required(),
  gameCode: joi.string().trim().required(),
  reason: joi.string().trim(),
  campaignId: joi.string().trim(),
  promoAmount: joi.number().min(0),
  context: joi.string().trim().required(),
}).required();


router.post('/transaction/cancelTransferToGame', async (req: express$Request, res: express$Response) => {
  try {
    const { body } = req;
    const value = await validate(body.cancelTransferToGame, cancelTransferToGameSchema);
    try {
      const { balance, message, partnerTransactionRef, result } = await WilliamsOperations.cancelTransferToGame(value);
      return res.type('text/xml').send(wrapResponse(
        'ns4:cancelTransferToGameResponse',
        `<balance>${balance}</balance>
         <message>${xmlEncode(message)}</message>
         <partnerTransactionRef>${xmlEncode(partnerTransactionRef)}</partnerTransactionRef>
         <result>${xmlEncode(result)}</result>`,
      ));
    } catch (ex) {
      const { balance: newBalance } = await WilliamsOperations.getBalance(value, false);
      return res.type('text/xml').send(wrapResponse(
        'ns4:cancelTransferToGameResponse',
        `<reconcile>false</reconcile><balance>${newBalance}</balance><result>FAILURE</result><message>${xmlEncode(ex.toString())}</message>`,
      ));
    }
  } catch (e) {
    if (!e.isJoi) {
      logger.warn('cancelTransferToGame', e);
    }
    return res.type('text/xml').send(wrapResponse('ns4:cancelTransferToGameResponse', '<result>FAILURE</result>'));
  }
});

const getBalanceSchema = joi.object({
  accountRef: joi.string().trim().required(),
  context: joi.string().trim().required(),
  currency: joi.string().trim().required(),
  gameCode: joi.string().trim().required(),
  ticket: joi.string().trim().required(),
}).required();

router.post('/player/getBalance', async (req: express$Request, res: express$Response) => {
  try {
    const { body } = req;
    const value = await validate(body.balance, getBalanceSchema);
    const { balance, result } = await WilliamsOperations.getBalance(value);
    return res.type('text/xml').send(wrapResponse(
      'ns3:balanceResponse',
      `<balance>${balance}</balance>
       <result>${xmlEncode(result)}</result>`,
    ));
  } catch (e) {
    if (!e.isJoi) {
      logger.warn('getBalance', e);
    }
    return res.type('text/xml').send(wrapResponse('ns3:balanceResponse', '<result>FAILURE</result>'));
  }
});

module.exports = router;
