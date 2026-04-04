/* @flow */
const MailChecker = require('mailchecker');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const { MOBILE, FIXED_LINE_OR_MOBILE } = require('google-libphonenumber').PhoneNumberType;
const _ = require('lodash');
const errors = require('gstech-core/modules/errors/error-codes');
const client = require('gstech-core/modules/clients/backend-auth-api');
const phoneNumber = require('gstech-core/modules/phoneNumber');
const utils = require('./utils');
const logger = require('./logger');
const configuration = require('./configuration');
const repository = require('./repository');
const smssender = require('./smsapicom');
const localization = require('./localization');
const { handleError } = require('./extensions');
const { emailDirect } = require('./queue');
const { requiresCaptcha } = require('./sms-rate-limit');

const isValid = (countryISO: ?string, phone: string) => {
  const numberInfo = phoneUtil.parse(phoneNumber.prefixed(phone), countryISO);
  if (!phoneUtil.isValidNumber(numberInfo)) return false;
  if (_.includes(repository.blockedCountryCodes(), numberInfo.getCountryCode())) return false;
  if (phoneUtil.getNumberType(numberInfo) === MOBILE) return true;
  if (phoneUtil.getNumberType(numberInfo) === FIXED_LINE_OR_MOBILE) return true;
  return false;
};

const verify = async (
  countryISO: ?string,
  phone: string,
  remoteIp: IPAddress = '',
): Promise<{ number: any, valid: boolean, needsCaptcha: boolean }> => {
  logger.debug('>>>> SMS VERIFY', { countryISO, phone });
  if (!countryISO && phone[0] !== '+') phone = `+${phone}`;
  try {
    const numberInfo = phoneUtil.parse(phone, countryISO);
    const valid = isValid(countryISO, phone);
    logger.debug('++++ SMS VERIFY', { countryISO, phone, valid });
    if (!valid) return Promise.reject(errors.INVALID_PHONE_NUMBER);
    const number = phoneUtil.format(numberInfo, PNF.E164);
    const needsCaptcha = await requiresCaptcha({ remoteIp, phone });

    logger.debug('<<<< SMS VERIFY', { countryISO, phone, valid, needsCaptcha });
    return { valid, number, needsCaptcha };
  } catch (e) {
    logger.error('XXXX SMS VERIFY', { countryISO, phone, e });
    return Promise.reject(errors.INVALID_PHONE_NUMBER);
  }
};

const send = async (
  languageCode: string,
  phone: string,
  code: string,
  retry: boolean,
): Promise<boolean> => {
  logger.debug('>>>> SMS::SEND', { languageCode, phone, code, retry });
  const mobilePhone = phoneNumber.parse(phone);
  if (mobilePhone != null) {
    const message = localization.localize(languageCode)('register.sms', { code });
    if (message != null) {
      const providersOnRotation = ['SmsApiCom'];
      const provider = providersOnRotation[Math.floor(Math.random() * providersOnRotation.length)];
      const action = 'Login';
      const options = { provider, action };
      logger.debug('>>>>> SMS::SEND smssender.send()', { code, message, retry, options });
      return smssender.send(mobilePhone, message, options);
    }
    logger.error(`XXXX SMS::SEND localization not found for ${languageCode}`);
  }
  logger.warn(`!!!! SMS::SEND Invalid phone number ${phone}`);
  return false;
};

const sendPinCode = async (
  req: express$Request,
  languageCode: string,
  phone: string,
  retry: boolean = false,
): Promise<boolean | { pinCode: string }> => {
  logger.debug('>>>> SMS::SENDPINCODE', { languageCode, phone });
  const mobilePhone = phoneNumber.parse(phone);
  if (mobilePhone != null) {
    const r = await client.registrationRequest(configuration.shortBrandId(), { mobilePhone });
    const { pinCode } = r;
    if (req.body.email && configuration.signUpVerificationChannel(req).primary === 'email') {
      logger.info('++++ SMS::SENDPINCODE OVERRIDE:EMAIL', {
        email: req.body.email,
        languageCode,
        currencyISO: req.context.currencyISO,
        pinCode,
        r,
      });
      if (!MailChecker.isValid(req.body.email) || configuration.isEmailBlacklisted(req.body.email))
        return Promise.reject({ ErrorNo: 'disposable-email' });
      await emailDirect('pincode', req.body.email, languageCode, req.context.currencyISO, {
        values: { pinCode },
      });
    } else {
      logger.debug('++++ SMS::SENDPINCODE', { pinCode, r });
      if (isValid(null, phone)) {
        await send(languageCode, phone, pinCode, retry);
        return { pinCode };
      }
      logger.error(`XXXX SMS::SENDPINCODE FAILED VERIFICATION`, {
        phone,
        region: phoneUtil.getRegionCodeForNumber(
          phoneUtil.parse(phoneNumber.prefixed(phone), null),
        ),
        IP: utils.getRemoteAddress(req),
        ipCountry: req.context.country.CountryISO,
      });
    }
    return { pinCode };
  }
  return false;
};

const sendPinCodeHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    const { retry } = req.query;
    logger.debug('>>> SMS::sendPinCodeHandler', { body: req.body, headers: req.headers, retry });
    if (req.body.countryISO === 'VN') {
      // Blocking botnet spamming pin code api with Vietnamese numbers. Need to figure out what to do to fix this properly.
      const resp = { valid: true, ok: true };
      logger.debug('+++ SMS::sendPinCodeHandler SKIP', { resp });
      return res.json(resp);
    }
    const valid = await sendPinCode(req, req.body.languageISO, req.body.phone, retry === 'true');
    const resp = { valid: !!valid, ok: true };
    logger.debug('<<< SMS::sendPinCodeHandler', { resp });
    return res.json(resp);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const verifyHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> SMS::verifyHandler', { body: req.body, headers: req.headers });
    const response = await verify(req.body.countryISO, req.body.phone, utils.getRemoteAddress(req));
    logger.debug('<<< SMS::verifyHandler', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX SMS::verifyHandler', { e });
    return res.json({ valid: false });
  }
};

module.exports = {
  verify,
  verifyHandler,
  sendPinCode,
  sendPinCodeHandler,
  send,
};
