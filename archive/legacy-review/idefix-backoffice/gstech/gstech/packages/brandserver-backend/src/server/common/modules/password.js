/* @flow */
import type {
  ValidatePasswordResetRequest,
  ValidatePasswordResetResponse,
  CompletePasswordResetRequest,
  RequestPasswordResetRequest,
} from 'gstech-core/modules/clients/backend-api-types';
import type { CommChannelMethodBase } from 'gstech-core/modules/types/config';

const errorCodes = require('gstech-core/modules/errors/error-codes');
const phoneNumber = require('gstech-core/modules/phoneNumber');
const validate = require('gstech-core/modules/validate');
const client = require('gstech-core/modules/clients/backend-auth-api');
const api = require('../api');
const logger = require('../logger');
const utils = require('../utils');
const configuration = require('../configuration');
const { handleError } = require('../extensions');
const smsverification = require('../smsverification');
const { emailDirect } = require('../queue');
const { loginWithPhoneNumber } = require('./player');
const {
  completePasswordResetSchema,
  requestPasswordResetSchema,
} = require('../common-routes-schemas');
const { getProfile } = require('./profile');
const { requiresCaptcha, requiresFallBackByRateLimit } = require('../sms-rate-limit');

const updatePassword = async (req: express$Request, oldPassword: string, password: string) => {
  const updatePasswordData = {
    NewPassword: password,
    OldPassword: oldPassword,
  };
  const x = await api.PlayerUpdateAccountPassword({
    sessionKey: req.session.SessionKey,
    updatePasswordData,
  });
  return x;
};

const setPassword = async (req: express$Request, password: string) => {
  const x = await api.PlayerSetAccountPassword({
    sessionKey: req.session.SessionKey,
    Password: password,
  });
  return x;
};

type PasswordResetContext = {
  requiresFallBack: boolean,
  defaultChannel: CommChannelMethodBase,
  fallBackChannel: ?CommChannelMethodBase,
  communicationChannel: CommChannelMethodBase,
};
const getPasswordResetContext = async (req: express$Request): Promise<PasswordResetContext> => {
  const remoteIp = utils.getRemoteAddress(req);
  const { primary, fallback } = configuration.resetPasswdVerificationChannel(req);
  const requiresFallBack =
    primary === 'sms' && fallback === 'email' && (await requiresFallBackByRateLimit({ remoteIp }));
  return {
    requiresFallBack,
    defaultChannel: primary,
    fallBackChannel: fallback,
    communicationChannel: fallback && requiresFallBack ? fallback : primary,
  };
};

const validatePasswordResetHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> validatePasswordResetHandler', {
      body: req.body,
      ip: utils.getRemoteAddress(req),
    });
    const { retry } = req.query;
    const body: ValidatePasswordResetRequest = validate(
      req.body,
      requestPasswordResetSchema,
      'validatePasswordReset schema validation failed',
    );

    if (req.context.country == null) {
      logger.warn('!!! requestPasswordResetHandler [NO Country at context]', { body });
      throw new Error(errorCodes.INVALID_INPUT.message);
    }

    const data: ValidatePasswordResetRequest = {
      email: body.email,
      mobilePhone: body.mobilePhone ? phoneNumber.parse(body.mobilePhone) : undefined,
      dateOfBirth: body.dateOfBirth,
    };

    logger.debug('>>>> passwordResetRequest', { brandId: configuration.shortBrandId(), data });
    const result = await client.passwordResetRequest(configuration.shortBrandId(), data);
    logger.debug('<<<< passwordResetRequest', { result });

    const requireCaptcha = await requiresCaptcha({
      remoteIp: utils.getRemoteAddress(req),
      email: body.email,
    });

    const passwordResetContext = await getPasswordResetContext(req);
    logger.debug('++++ passwordResetContext', { passwordResetContext });

    const response: ValidatePasswordResetResponse = {
      ok: true,
      requireCaptcha: requireCaptcha || retry === 'true',
      email: result.email,
      number: phoneNumber.formatMasked(result.mobilePhone),
      verificationChannel: passwordResetContext.communicationChannel,
    }
    logger.debug('<<< validatePasswordResetHandler', { response });
    return res.json(response);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const requestPasswordResetHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> requestPasswordResetHandler', {
      body: req.body,
      ip: utils.getRemoteAddress(req),
    });
    const { retry } = req.query;
    const body: RequestPasswordResetRequest = validate(
      req.body,
      requestPasswordResetSchema,
      'requestPasswordReset schema validation failed',
    );

    if (req.context.country == null) {
      logger.warn('!!! requestPasswordResetHandler [NO Country at context]', { body });
      throw new Error(errorCodes.INVALID_INPUT.message);
    }

    const data: RequestPasswordResetRequest = {
      email: body.email,
      mobilePhone: body.mobilePhone ? phoneNumber.parse(body.mobilePhone) : undefined,
      dateOfBirth: body.dateOfBirth,
    };

    logger.debug('>>>> passwordResetRequest', { brandId: configuration.shortBrandId(), data });
    const result = await client.passwordResetRequest(configuration.shortBrandId(), data);
    logger.debug('<<<< passwordResetRequest', { result });

    const requireCaptcha = await requiresCaptcha({
      remoteIp: utils.getRemoteAddress(req),
      email: body.email,
    });

    // New implementation
    const passwordResetContext = await getPasswordResetContext(req);
    logger.debug('++++ passwordResetContext', { passwordResetContext });

    let ok = true;
    // Is email exists ? Should be in result at gstech verification!
    if (passwordResetContext.communicationChannel === 'email')
      await emailDirect(
        'reset-passwd',
        result.email,
        req.context.languageISO,
        req.context.currencyISO,
        {
          values: { pinCode: result.pinCode },
        },
      );
    else if (passwordResetContext.communicationChannel === 'sms')
      ok = await smsverification.send(
        req.context.languageISO,
        result.mobilePhone,
        result.pinCode,
        retry === 'true',
      );

    const response = {
      ok,
      email: body.email,
      number: phoneNumber.formatMasked(result.mobilePhone),
      requireCaptcha,
      channel: passwordResetContext.communicationChannel,
    };

    logger.debug('<<< requestPasswordResetHandler', { response });
    return res.json(response);
    // endof

    /*
    if (configuration.resetPasswdVerificationChannel() === 'email') {
      if (body.email && body.email.length > 0) {
        await emailDirect(
          'reset-passwd',
          body.email,
          req.context.languageISO,
          req.context.currencyISO,
          {
            values: { pinCode: result.pinCode },
          },
        );
        const response = { ok: true, email: body.email, requireCaptcha };
        logger.debug('<<< requestPasswordResetHandler [EMAIL]', { response });
        return res.json(response);
      }
      logger.warn('!!! requestPasswordResetHandler [NOEMAIL]', 'USING SMS', { body, result });
    }
    const ok = await smsverification.send(
      req.context.languageISO,
      result.mobilePhone,
      result.pinCode,
      retry === 'true',
    );
    const response = { ok, number: phoneNumber.formatMasked(result.mobilePhone), requireCaptcha };
    logger.debug('<<< requestPasswordResetHandler [SMS]', { response });
    return res.json(response);
    */
  } catch (e) {
    return handleError(req, res, e);
  }
};

const completePasswordResetHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    const body: CompletePasswordResetRequest = validate(
      req.body,
      completePasswordResetSchema,
      'completePasswordReset schema validation failed',
    );
    const data: CompletePasswordResetRequest = {
      email: body.email,
      mobilePhone: body.mobilePhone ? phoneNumber.parse(body.mobilePhone) : undefined,
      pinCode: body.pinCode,
      newPassword: body.newPassword,
    };

    const result = await client.passwordResetComplete(configuration.shortBrandId(), data);
    if (result.ok) {
      const loginResult: any = await loginWithPhoneNumber(req, res, result.mobilePhone);
      return res.json(loginResult);
    }

    return res.json({ ok: false });
  } catch (e) {
    return handleError(req, res, e);
  }
};

const updatePasswordHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    await updatePassword(req, req.body.oldPassword, req.body.password);
    const profile = await getProfile(req);
    return res.json(profile);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const setPasswordHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    await setPassword(req, req.body.password);
    const profile = await getProfile(req);
    return res.json(profile);
  } catch (e) {
    return handleError(req, res, e);
  }
};

module.exports = {
  validatePasswordResetHandler,
  requestPasswordResetHandler,
  completePasswordResetHandler,
  updatePasswordHandler,
  setPasswordHandler,
};
