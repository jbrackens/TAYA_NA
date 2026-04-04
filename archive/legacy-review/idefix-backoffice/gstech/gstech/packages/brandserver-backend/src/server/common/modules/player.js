/* @flow */
import type { SessionToken } from 'gstech-core/modules/clients/backend-api-types';
import type { LegacyPlayer, LegacyBoolean, PlayerRegisterAccountResponse } from '../api';
import type { BrandServerConfiguration } from "../types";

const _ = require('lodash');
const { v1: uuid } = require('uuid');
const MailChecker = require('mailchecker');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const slack = require('gstech-core/modules/slack');
const { sleep, isTestEmail } = require('gstech-core/modules/utils');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const phoneNumber = require('gstech-core/modules/phoneNumber');
const errors = require('gstech-core/modules/errors/error-codes');
const logger = require('../logger');
const { moneyFrom } = require('../money');
const clientCallback = require('../client-callback');
const api = require('../api');
const repository = require('../repository');
const configuration = require('../configuration');
const utils = require('../utils');
const { handleSelfExclusion } = require('./selfexclusion');
const { getDetailsWithSessionKey } = require('./legacy-player');
const smsverification = require('../smsverification');
const { updateFraudStatus, checkFraud, ignoreCountries } = require('./fraud');
const { validateFraudToken } = require('../fraud-token');
const { sendActivation } = require('./activation');
const events = require('./events');
const { findPlayer, updatePlayerCache } = require('./legacy-player');

const checkIfEmailExists = (req: express$Request, emailAddress: string) => {
  if (!emailAddress) return Promise.reject(errors.INVALID_EMAIL);
  return api.PlayerValidateEmailExists({ emailAddress }).then(({ Exists, valid }) => {
    logger.debug('validateEmail', { emailAddress, valid });
    if (valid === false && !isTestEmail(emailAddress)) return Promise.reject(errors.INVALID_EMAIL);
    return Exists === 'true';
  });
};

const login = async (
  req: express$Request,
  res: express$Response,
  email: string,
  clientPassword: string,
  token: ?string,
  checkToken: boolean = configuration.productionMode(),
): Promise<any> | Promise<{ deposits: boolean, ok: boolean }> => {
  const ipAddress = utils.getRemoteAddress(req);
  if (req.context != null && req.context.country != null) {
    const ipCountry = req.context.country.CountryISO;
    if (checkToken && !_.includes(ignoreCountries, ipCountry) && !validateFraudToken(req, token)) {
      logger.warn(
        'SECURITY Invalid login token',
        utils.getRemoteAddress(req),
        req.body.email,
        req.body.token,
        req.context.country.CountryISO,
        req.headers,
      );
      slack.securityMessage(
        configuration.project(),
        'Blocked invalid login',
        { IP: utils.getRemoteAddress(req), 'IP Country': ipCountry, email: req.body.email },
        'danger',
      );
      req.session.destroy();
      return Promise.reject(errors.INVALID_LOGIN_DETAILS);
    }
  }
  logger.debug('Pre login', email, utils.getRemoteAddress(req), req.headers);
  try {
    const re = await api.SessionLoginWithCustomInfo({
      email,
      clientPassword,
      ipAddress,
      userAgent: req.headers['user-agent'],
    });
    return await loginUser(req, res, re, re.player);
  } catch (response) {
    if (response.ErrorNo === errors.PLAYER_EXCLUDED.code)
      return await handleSelfExclusion(req, response);
    return Promise.reject(response);
  }
};

const loginWithPhoneNumber = async (
  req: express$Request,
  res: express$Response,
  mobilePhone: string,
): Promise<any> | Promise<{ deposits: boolean, ok: boolean }> => {
  const ipAddress = utils.getRemoteAddress(req);
  logger.debug('Pre login by mobilePhone', mobilePhone, utils.getRemoteAddress(req), req.headers);
  try {
    const re = await api.loginWithPhoneNumber(mobilePhone, ipAddress, req.headers['user-agent']);
    const r = await loginUser(req, res, re, re.player);
    return r;
  } catch (response) {
    if (
      response.ErrorNo === 511 &&
      (response.exclusion != null ? response.exclusion.expires : undefined) != null
    )
      return await handleSelfExclusion(req, response);
    return Promise.reject(response);
  }
};

export type LegacyPlayerDraft = {
  firstName: string,
  lastName: string,
  countryISO: string,
  phone: string,
  address: string,
  postCode: string,
  city: string,
  currencyISO: string,
  lang: string,
  dateOfBirth: string,
  receivePromotional: LegacyBoolean,
  lander: string,
  pinCode: string,
};

const processRegistration = async (
  req: express$Request,
  res: express$Response,
  data: any,
  u: any,
  result: {
    player: LegacyPlayer,
    LoginReturn: { SessionKey: SessionToken },
    ...
  },
) => {
  const username = result.player.Username;
  logger.debug('>>>>>> processRegistration', {
    username,
    cookies: req.cookies,
    player: result.player,
  });
  const user = api.mapLegacyPlayer(result.player);
  await updateFraudStatus(req, res, user);
  const sessionKey = result.LoginReturn.SessionKey;
  const backendUser = await getDetailsWithSessionKey(sessionKey);
  await loginUser(req, res, result.LoginReturn, backendUser);
  await initGameProviders(req);
  const verificationChannel = configuration.signUpVerificationChannel(req).primary;

  if (verificationChannel === 'email') {
    await api.PlayerActivateViaEmailVerification({
      username,
      ipAddress: utils.getRemoteAddress(req),
    })
  } else {
    await sendActivation(req);
  }
  await events().register(req, user);
  await setLoginCookie(res);
  const resp = { ok: true, activated: true, register: true };
  logger.debug('<<<<<< processRegistration', { username, resp });
  return resp;
};

const doRegister = async (
  req: express$Request,
  res: express$Response,
  email: string,
  password: string,
  data: LegacyPlayerDraft,
) => {
  logger.debug('>>>>> doRegister', { email, headers: req.headers, context: req.context });
  const firstName = utils.capitalize(data.firstName);
  const lastName = utils.capitalize(data.lastName);
  const ipAddress = utils.getRemoteAddress(req);
  const phone = (() => {
    try {
      return phoneUtil.format(phoneUtil.parse(data.phone, data.countryISO), PNF.E164);
    } catch (error1) {
      logger.error('XXXXX doRegister:phone', 'Unable to format phonenumber, using default', {
        error: error1,
        phone: data.phone,
      });
      return data.phone;
    }
  })();
  const verificationChannel: BrandServerConfiguration['signUpVerificationChannel'] =
    configuration.signUpVerificationChannel(req).primary;
  const communicationMethodStatus =
    verificationChannel === 'email'
      ? { emailStatus: 'verified' }
      : { mobilePhoneStatus: 'verified' };
  const u = {
    ipAddress,
    userAgent: req.headers['user-agent'],
    firstName,
    lastName,
    address: data.address,
    postCode: data.postCode,
    city: data.city,
    countryId: data.countryISO,
    currencyId: data.currencyISO,
    languageId: data.lang ? data.lang.toUpperCase() : req.context.languageISO,
    dateOfBirth: data.dateOfBirth,
    emailAddress: email,
    mobilePhone: phoneNumber.parse(phone),
    password,
    affiliateRegistrationCode: req.cookies.ldaffid2 || configuration.defaultBtag(),
    receivePromotional: data.receivePromotional || '0',
    tcVersion: configuration.newUserTcVersion,
    registrationSource: data.lander,
    ...communicationMethodStatus,
    pinCode: data.pinCode,
  };
  logger.info('+++++ doRegister', `AFF_ID: ${u.affiliateRegistrationCode}`, {
    affid: u.affiliateRegistrationCode,
    receivePromotional: data.receivePromotional,
    email,
    firstName,
    lastName,
  });
  const result: PlayerRegisterAccountResponse = await api
    .PlayerRegisterAccount(u, data.pinCode)
    .catch((error) => {
      logger.error('XXXXXX doRegister:PlayerRegisterAccount', { error, u });
      checkFraud(req, res, phone, error);
      return Promise.reject(error);
    });
  // TODO: last parameter controls wether we sent activation message, can be false if verification channel = email
  const r = await processRegistration(req, res, data, u, result);
  await clientCallback.pushEvent(req, { event: 'landingpage_register', target: data.lander || '' });
  await clientCallback.pushEvent(req, { event: 'nrc' });
  logger.debug('<<<<< doRegister', { email, r });
  return r;
};

const register = async (req: express$Request, res: express$Response, form: any): Promise<any> => {
  const exists = await checkIfEmailExists(req, form.email);
  if (exists) return Promise.reject({ ErrorNo: 'user_already_exists' });
  if (!MailChecker.isValid(form.email) || configuration.isEmailBlacklisted(form.email))
    return Promise.reject({ ErrorNo: 'disposable-email' });
  const validPhone = await smsverification.verify(form.countryISO, form.phone);
  if (!validPhone.valid) return Promise.reject(errors.INVALID_PHONE_NUMBER);
  logger.debug('>>>> register', {
    exists,
    pincode: form.pinCode,
    phone: form.phone,
    email: form.email,
    dateOfBirth: form.dateOfBirth,
  });
  const response = await doRegister(req, res, form.email, form.password, form);
  logger.debug('<<<< register', { response });
  return response;
};

const setLoginCookie = (res: express$Response) =>
  res.cookie('ldl', 'true', {
    path: '/',
    secure: configuration.productionMode(),
    maxAge: 1000 * 60 * 60 * 24 * 30 * 6,
  });

const initPlayngoUser = async (req: express$Request) => {
  try {
    logger.debug('initPlayngoUser', req.session.username);
    const playngoGame = await repository.findGame('spinparty');
    if (playngoGame && playngoGame.GameID) {
      const game = await api.GameStartGame({
        sessionKey: req.session.SessionKey,
        gameID: playngoGame.GameID,
        customOptions: {},
        requireActivation: false,
      });
      await clientCallback.loadScript(req, game.InitScript);
    }
  } catch (e) {
    logger.warn('initPlayngoUser failed', e);
  }
};

const initGameProviders = async (req: express$Request) => {
  if (configuration.productionMode()) await initPlayngoUser(req);
};

const loginUser = async (
  req: express$Request,
  res: express$Response,
  response: { SessionKey: string, ... },
  backendUser: LegacyPlayer,
) => {
  req.session.SessionKey = response.SessionKey;
  req.session.username = backendUser.Username;
  // eslint-disable-next-line no-promise-executor-return
  await new Promise((resolve) => req.session.save(resolve));
  const customer = await findPlayer(req.session.username);
  req.user = customer;
  setLoginCookie(res);
  if (customer == null) {
    logger.error('loginUser with invalid data', customer);
    return Promise.reject('Invalid user');
  }
  logger.debug('Player session created', req.session.username);
  utils.initContext(req, res, customer);
  await clientCallback.pushEvent(req, { event: 'login' });
  if (!backendUser.ReceivePromotionalByEmail && !backendUser.ReceivePromotionalBySMS)
    await clientCallback.pushEvent(req, { event: 'nomarketing' });
  if (req.user.numDeposits > 5) await clientCallback.pushEvent(req, { event: 'login-regular' });
  else await clientCallback.pushEvent(req, { event: 'login-new' });
  return { ok: true, deposits: parseInt(customer.numDeposits) > 0 };
};

const updateDetails = async (req: express$Request) => {
  const details = await getDetailsWithSessionKey(req.session.SessionKey);
  await updatePlayerCache(details);
  const player = await findPlayer(req.user.username);
  req.user = player;
};

const updateProfile = async (req: express$Request, data: any) => {
  const profile = {
    sessionKey: req.session.SessionKey,
    languageCode: data.languageISO.toUpperCase(),
  };
  await api.PlayerUpdateLanguage(profile);
  updateDetails(req);
};

const updateProfileRealityCheck = async (req: express$Request, data: any) => {
  const profile = {
    sessionKey: req.session.SessionKey,
    realityCheckMinutes: +data.realityCheckMinutes,
  };
  await api.PlayerUpdateRealityCheck(profile);
  updateDetails(req);
};

const payNPlayDeposit = async (
  req: express$Request,
  amount: Money,
  bonusId: ?number,
): Promise<{ url: string, html: string, requiresFullscreen: boolean }> => {
  const client = {
    ipAddress: utils.getRemoteAddress(req),
    userAgent: req.headers['user-agent'],
    isMobile: req.context.mobile,
  };
  const data = {
    lang: req.context.languageISO,
    lander: req.params.page,
    currencyISO: req.context.currencyISO,
    countryISO: req.context.countryISO,
  };
  const u = {
    ipAddress: utils.getRemoteAddress(req),
    countryId: data.countryISO,
    currencyId: data.currencyISO,
    languageId: data.lang,
    affiliateRegistrationCode: req.cookies.ldaffid2 || configuration.defaultBtag(),
    tcVersion: configuration.newUserTcVersion,
    registrationSource: data.lander,
  };
  logger.debug('payNPlayDeposit data', { client, data, u });
  await clientCallback.pushEvent(req, { event: 'landingpage_register', target: data.lander || '' });
  const transactionKey = uuid(); // TODO
   
  const { player, url, html, requiresFullscreen } = await api.startPartialLogin(
    req,
    transactionKey,
    'Brite',
    amount,
    bonusId,
    u,
    configuration.baseUrl(`/api/register/pending/${transactionKey}`),
    configuration.baseUrl('/api/register/fail'),
    client,
  );
  logger.debug('startPartialLogin result', {
    url,
    html,
    requiresFullscreen,
    player,
    transactionKey,
  });
  return { url, html, requiresFullscreen };
};

const payNPlayLogin = async (
  req: express$Request,
): Promise<{ url: string, html: string, requiresFullscreen: boolean }> => {
  const client = {
    ipAddress: utils.getRemoteAddress(req),
    userAgent: req.headers['user-agent'],
    isMobile: req.context.mobile,
  };
  const data = {
    lang: req.context.languageISO,
    lander: req.params.page,
    currencyISO: req.context.currencyISO,
    countryISO: req.context.countryISO,
  };
  const u = {
    ipAddress: utils.getRemoteAddress(req),
    countryId: data.countryISO,
    currencyId: data.currencyISO,
    languageId: data.lang,
    affiliateRegistrationCode: req.cookies.ldaffid2 || configuration.defaultBtag(),
    tcVersion: configuration.newUserTcVersion,
    registrationSource: data.lander,
  };
  logger.debug('payNPlayDeposit data', { client, data, u });
  const transactionKey = uuid();
  const { player, url, html, requiresFullscreen } = await api.startPartialLogin(
    req,
    transactionKey,
    'Brite',
    0,
    null,
    u,
    configuration.baseUrl(`/api/login/pending/${transactionKey}`),
    configuration.baseUrl('/api/login/fail'),
    client,
  );
  logger.debug('startPartialLogin result', {
    url,
    html,
    requiresFullscreen,
    player,
    transactionKey,
  });
  return { url, html, requiresFullscreen };
};

const payNPlayDepositProgress = async (
  req: express$Request,
  res: express$Response,
  transactionKey: string,
): Promise<boolean> => {
  const [ipAddress, userAgent] = [utils.getRemoteAddress(req), req.headers['user-agent']];
  const logPrefix = `payNPlayDepositProgress [${transactionKey}]`;
  const { status, parameters } = await api.getPartialLogin(transactionKey);
  if (status === 'failed') throw new Error(`${logPrefix} Partial failed: ${parameters?.message}`);
  if (status === 'started') return false;
  // if (status === 'completed') return true; //* Not sure about this
  const { deposit } = await api.getDeposit(req.params.transactionKey);
  if (['failed', 'cancelled', 'expired'].includes(deposit.status))
    throw new Error(`${logPrefix} deposit status: ${deposit.status}`);
  if (!['complete', 'pending', 'settled'].includes(deposit.status)) {
    logger.warn(`Can't finalize deposit with status: ${deposit.status}`);
    return false;
  }
  const player = await findPlayer(deposit.username);
  logger.debug(`${logPrefix} findPlayer`, { player });
  const r = await api
    .completePartialLogin(transactionKey, ipAddress, userAgent)
    .then((result: any) => ({
      // FIXME: flow type
      SessionKey: result.token,
      player: api.mapPlayerDetails(result.player),
    }));
  logger.debug(`${logPrefix} completePartialLogin`, { r, deposit });
  await loginUser(req, res, r, r.player);
  const value = parseInt(
    moneyFrom(deposit.amount, req.user.details.CurrencyISO).asBaseCurrency().asFloat(),
  );
  if (deposit.index === 0) {
    await clientCallback.pushEvent(req, { event: 'nrc' });
    await clientCallback.pushEvent(req, { event: 'ndc', value });
  } else await clientCallback.pushEvent(req, { event: 'deposit', value });
  return true;
};

const payNPlayLoginProgress = async (
  req: express$Request,
  res: express$Response,
  transactionKey: string,
): Promise<void> => {
  const [ipAddress, userAgent] = [utils.getRemoteAddress(req), req.headers['user-agent']];
  const logPrefix = (n: number) => `payNPlayLoginProgress [${transactionKey}] #${n}`;
  const numTries = 4;
  let d = 1;
  let p = await api.getPartialLogin(transactionKey);
  for (; d <= numTries; d++) {
    logger.debug(`${logPrefix(d)}: ${p.status}`);
    if (['completed', 'verified', 'failed'].includes(p.status)) break;
    if (p.status === 'started' && d < numTries) await sleep(d * 1500);
    p = await api.getPartialLogin(transactionKey);
  }
  if (p.status === 'failed') throw new Error(`${logPrefix(d)} failed: ${p.parameters?.message}`);
  if (p.status === 'started') throw new Error(`${logPrefix(d)} took too long to verify`);
  if (p.status === 'verified') {
    const r = await api
      .completePartialLogin(transactionKey, ipAddress, userAgent)
      .then((result: any) => ({
        // FIXME: flow type
        SessionKey: result.token,
        player: api.mapPlayerDetails(result.player),
      }));
    logger.debug(`${logPrefix(d)} completePartialLogin: ${p.status}`, { r });
    await loginUser(req, res, r, r.player);
  }
};

const completeRegistration = async (
  req: express$Request,
  res: express$Response,
  form: any,
): Promise<boolean> => {
  const emailExists = await checkIfEmailExists(req, form.email);
  if (emailExists) return Promise.reject({ ErrorNo: 'user_already_exists' });
  if (!MailChecker.isValid(form.email) || configuration.isEmailBlacklisted(form.email))
    return Promise.reject({ ErrorNo: 'disposable-email' });
  const player = await api.completePlayerRegistration(req, {
    emailAddress: form.email,
    password: form.password,
    receivePromotional: form.receivePromotional || '0',
  });
  await updatePlayerCache(player);
  req.user = await findPlayer(req.user.username);
  await sendActivation(req);
  return true;
};

const completePartialRegistration = async (
  req: express$Request,
  res: express$Response,
  form: any,
): Promise<boolean> => {
  const {
    pnp_complete_email: email,
    pnp_complete_phone: phone,
    pnp_complete_promo: allowPromotions,
  } = form;
  const emailExists = await checkIfEmailExists(req, email);
  if (emailExists) return Promise.reject({ ErrorNo: 'user_already_exists' });
  const { CountryISO } = req.user.details;
  const { valid, number: mobilePhone } = await smsverification.verify(CountryISO, phone);
  if (!valid) return Promise.reject(errors.INVALID_PHONE_NUMBER);
  const player = await api.completePartialPlayerRegistration(req, req.user.details.ClientID, {
    email,
    mobilePhone,
    allowEmailPromotions: allowPromotions,
    allowSMSPromotions: allowPromotions,
  });
  await updatePlayerCache(player);
  req.user = await findPlayer(req.user.username);
  await sendActivation(req);
  return true;
};

module.exports = {
  login,
  register,
  updateProfile,
  updateDetails,
  updateProfileRealityCheck,
  loginWithPhoneNumber,
  payNPlayDeposit,
  payNPlayLogin,
  payNPlayDepositProgress,
  payNPlayLoginProgress,
  completeRegistration,
  completePartialRegistration,
};
