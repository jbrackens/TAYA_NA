/* @flow */
const json2xml = require('json2xml');
const joi = require('joi');
const { Router } = require('express');
const logger = require('gstech-core/modules/logger');
const PlaynGoOperations = require('./PlaynGoOperations');
const { statusCodes, localizedStatusCodes } = require('./constants');

const router: express$Router<> = Router();  

const buildResponse = (type: string, body: string) => {
  const response = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><${type}>${body}</${type}>`;
  logger.debug('PlaynGo response', response);
  return response;
};

const wrapResponse = (type: string, body: any) => buildResponse(type, json2xml({ ...body, statusCode: '0', statusMessage: 'OK' }));

const validate = (
  body: any,
  schema: Joi$Schema<any>,
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

const errorResponse = (
  type: string,
  status: { code: string, message: string, png?: boolean },
  langCode: string = 'en_GB',
) => {
  const localizedError =
    // $FlowFixMe[invalid-computed-prop]
    localizedStatusCodes[langCode] != null
      ? localizedStatusCodes[langCode][status.code]
      : status.message;
  return buildResponse(
    type,
    `<statusCode>${status.code}</statusCode><statusMessage>${localizedError}</statusMessage>`,
  );
};

const errorMapping = { // $FlowFixMe
  10001: statusCodes.STATUS_NONUSER, // $FlowFixMe
  10002: statusCodes.STATUS_INTERNAL, // $FlowFixMe
  10003: statusCodes.STATUS_INTERNAL, // $FlowFixMe
  10004: statusCodes.STATUS_SESSIONEXPIRED, // $FlowFixMe
  10005: statusCodes.STATUS_SERVICEUNAVAILABLE, // $FlowFixMe
  10006: statusCodes.STATUS_NOTENOUGHMONEY, // $FlowFixMe
  10007: statusCodes.STATUS_INTERNAL, // $FlowFixMe
  10008: statusCodes.STATUS_SPENDINGBUDGETEXCEEDED, // $FlowFixMe
  10009: statusCodes.STATUS_ACCOUNTLOCKED, // $FlowFixMe
};

const handleError = (res: express$Response, method: string, e: any, langCode?: string) => {
  logger.debug('handleError', method, e);
  // $FlowFixMe[invalid-computed-prop]
  if (e.code && errorMapping[`${e.code}`] != null) {
    // $FlowFixMe[invalid-computed-prop]
    return res.type('text/xml').send(errorResponse(method, errorMapping[`${e.code}`], langCode));
  }
  if (e.png) {
    return res.type('text/xml').send(errorResponse(method, e, langCode));
  }
  logger.warn('PlayNGo wallet error', method, e);
  return res.type('text/xml').send(errorResponse(method, statusCodes.STATUS_INTERNAL));
};

const authenticateSchema = joi.object({
  username: joi.string().trim().required(),
  productId: joi.string().trim(),
  clientIP: joi.string().trim(),
  contextId: joi.string().trim().allow(''),
  language: joi.string().trim(),
  gameId: joi.string().trim(),
  accessToken: joi.string().trim().required(),
}).required();

router.post('/authenticate', async (req: express$Request, res: express$Response) => {
  try {
    const { body } = req;
    const value = await validate(body.authenticate, authenticateSchema);
    try {
      const response = await PlaynGoOperations.authenticate(value);
      return res.type('text/xml').send(wrapResponse('authenticate', response));
    } catch (e) {
      return handleError(res, 'authenticate', e, value.language);
    }
  } catch (e) {
    return handleError(res, 'authenticate', e);
  }
});

const reserveSchema = joi.object({
  externalId: joi.string().trim().required(),
  accessToken: joi.string().trim().required(),
  productId: joi.string().trim(),
  transactionId: joi.string().trim(),
  real: joi.string().trim().required(),
  currency: joi.string().trim().required(),
  gameId: joi.string().trim().required(),
  gameSessionId: joi.string().trim(),
  contextId: joi.string().trim().allow(''),
  roundId: joi.string().trim().required(),
  externalGameSessionId: joi.string().trim(),
}).required();

router.post('/reserve', async (req: express$Request, res: express$Response) => {
  try {
    const { body } = req;
    const value = await validate(body.reserve, reserveSchema);
    const response = await PlaynGoOperations.reserve(value);
    return res.type('text/xml').send(wrapResponse('reserve', response));
  } catch (e) {
    return handleError(res, 'reserve', e);
  }
});

const releaseSchema = joi.object({
  externalId: joi.string().trim().required(),
  accessToken: joi.string().trim().required(),
  productId: joi.string().trim().required(),
  transactionId: joi.string().trim().required(),
  real: joi.string().trim().required(),
  currency: joi.string().trim().required(),
  gameSessionId: joi.string().trim().required(),
  contextId: joi.string().trim().allow(''),
  state: joi.string().trim().required(),
  totalLoss: joi.string().trim(),
  totalGain: joi.string().trim(),
  numRounds: joi.number().integer().min(0),
  type: joi.string().trim().required(),
  gameId: joi.string().trim().required(),
  roundId: joi.string().trim().required(),
  jackpotGain: joi.number().min(0).required(),
  jackpotLoss: joi.number().min(0).required(),
  jackpotGainSeed: joi.number().min(0),
  jackpotGainID: joi.string().trim(),
  freegameExternalId: joi.string().trim().allow(''),
  turnover: joi.string().trim(),
  freegameFinished: joi.string().trim().valid('0', '1'),
  freegameGain: joi.string().trim(),
  freegameLoss: joi.string().trim(),
  externalGameSessionId: joi.string().trim(),
}).required();

router.post('/release', async (req: express$Request, res: express$Response) => {
  try {
    const { body } = req;
    const value = await validate(body.release, releaseSchema);
    const response = await PlaynGoOperations.release(value);
    return res.type('text/xml').send(wrapResponse('release', response));
  } catch (e) {
    return handleError(res, 'release', e);
  }
});

const cancelReserveSchema = joi.object({
  externalId: joi.string().trim().required(),
  accessToken: joi.string().trim().required(),
  productId: joi.string().trim().required(),
  transactionId: joi.string().trim().required(),
  real: joi.string().trim().required(),
  currency: joi.string().trim().required(),
  gameSessionId: joi.string().trim(),
  roundId: joi.string().trim(),
  gameId: joi.string().trim(),
  externalGameSessionId: joi.string().trim(),
}).required();

router.post('/cancelReserve', async (req: express$Request, res: express$Response) => {
  try {
    const { body } = req;
    const value = await validate(body.cancelReserve, cancelReserveSchema);
    const response = await PlaynGoOperations.cancelReserve(value);
    return res.type('text/xml').send(wrapResponse('cancelReserve', response));
  } catch (e) {
    return handleError(res, 'cancelReserve', e);
  }
});

const balanceSchema = joi.object({
  externalId: joi.string().trim().required(),
  accessToken: joi.string().trim().required(),
  productId: joi.string().trim(),
  currency: joi.string().trim(),
  gameId: joi.string().trim(),
  externalGameSessionId: joi.string().trim(),
}).required();

router.post('/balance', async (req: express$Request, res: express$Response) => {
  try {
    const { body } = req;
    const value = await validate(body.balance, balanceSchema);
    const response = await PlaynGoOperations.balance(value);
    return res.type('text/xml').send(wrapResponse('balance', response));
  } catch (e) {
    return handleError(res, 'balance', e);
  }
});

module.exports = router;
