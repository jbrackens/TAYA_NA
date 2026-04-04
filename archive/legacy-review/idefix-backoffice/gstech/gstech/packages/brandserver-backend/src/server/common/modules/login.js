/* @flow */
import type { CompleteLoginRequest, RequestLoginRequest } from 'gstech-core/modules/clients/backend-api-types';

const joi = require('joi');
const _ = require('lodash');
const phoneNumber = require('gstech-core/modules/phoneNumber');
const client = require('gstech-core/modules/clients/backend-auth-api');
const validate = require('gstech-core/modules/validate');
const logger = require('../logger');
const { handleError } = require('../extensions');
const { login, loginWithPhoneNumber } = require('./player');
const api = require('../api');
const configuration = require('../configuration');
const utils = require('../utils');
const smsverification = require('../smsverification');
const notifications = require('../notifications');
const { createJourney } = require('../journey');

const completeLoginSchema = joi.alternatives().try(
  joi
    .object({
      email: joi
        .string().trim()
        .lowercase()
        .email()
        .required(),
      pinCode: joi.string().trim().required(),
    })
    .required()
    .options({ stripUnknown: true }),
  joi
    .object({
      mobilePhone: joi
        .string().trim()
        .trim()
        .required(),
      pinCode: joi.string().trim().required(),
    })
    .required()
    .options({ stripUnknown: true }),
);

const requestLoginSchema = joi.alternatives().try(
  joi
    .object({
      email: joi
        .string().trim()
        .lowercase()
        .email()
        .required(),
    })
    .required()
    .options({ stripUnknown: true }),
  joi
    .object({
      mobilePhone: joi
        .string().trim()
        .trim()
        .required(),
    })
    .required()
    .options({ stripUnknown: true }),
);

const getNextUrlAfterLogin = async (req: express$Request): Promise<?string> => {
  const journey = await createJourney(req);
  const n = await notifications.forUser(req, journey);
  const notification = _.first(n.filter(({ openOnLogin, unread }) => openOnLogin && unread));
  return notification ? `/loggedin/inbox/${notification.id}/` : null;
};

const successfullLogin = async (
  req: express$Request,
  res: express$Response,
  x: any | { deposits: boolean, ok: boolean },
) => {
  if (!x.restrictionActive) {
    const topgames = await api.topGames(req);
    req.session.topgames = topgames;
    logger.debug('Game recommendations', req.body.email, JSON.stringify(topgames));
    const nUrl = await getNextUrlAfterLogin(req);
    const nextUrl = req.body.nextUrl || nUrl;
    logger.debug('successfulLogin', req.body.email, { nextUrl });
    return res.json(_.extend({ nextUrl }, x));
  }
  return res.json(x);
};

const loginHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const x = await login(req, res, req.body.email, req.body.password, req.body.token);
    return await successfullLogin(req, res, x);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const requestLoginPinCodeHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('requestLogin', req.body, utils.getRemoteAddress(req));
    const { retry } = req.query;
    const body: RequestLoginRequest = validate(req.body, requestLoginSchema, 'requestLogin schema validation failed');
    const data: RequestLoginRequest = {
      email: body.email,
      mobilePhone: body.mobilePhone ? phoneNumber.parse(body.mobilePhone) : undefined,
    };

    const result = await client.loginRequest(configuration.shortBrandId(), data);
    const ok = await smsverification.send(req.context.languageISO, result.mobilePhone, result.pinCode, retry === 'true');

    const response = {
      ok,
      number: phoneNumber.formatMasked(result.mobilePhone),
    };

    return res.json(response);
  } catch (e) {
    return handleError(req, res, e);
  }
};
const completePinCodeLoginHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('completeLogin', req.body, utils.getRemoteAddress(req));
    const body: CompleteLoginRequest = validate(req.body, completeLoginSchema, 'completeLogin schema validation failed');
    const data: CompleteLoginRequest = {
      email: body.email,
      mobilePhone: body.mobilePhone ? phoneNumber.parse(body.mobilePhone) : undefined,
      pinCode: body.pinCode,
      ipAddress: utils.getRemoteAddress(req),
      userAgent: req.headers['user-agent'],
    };

    const loginCompleteResponse = await client.loginComplete(configuration.shortBrandId(), data);
    if (loginCompleteResponse.player) {
      const loginResult: any = await loginWithPhoneNumber(req, res, loginCompleteResponse.player.mobilePhone);
      return await successfullLogin(req, res, loginResult);
    }
    return res.json({ ok: false });
  } catch (e) {
    return handleError(req, res, e);
  }
};
module.exports = {
  loginHandler,
  requestLoginPinCodeHandler,
  completePinCodeLoginHandler,
  getNextUrlAfterLogin,
}