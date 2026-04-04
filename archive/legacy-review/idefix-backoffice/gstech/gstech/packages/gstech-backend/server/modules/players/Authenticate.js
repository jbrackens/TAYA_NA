/* @flow */
const moment = require('moment-timezone');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pg = require('gstech-core/modules/pg');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const { parse } = require('gstech-core/modules/phoneNumber');
const logger = require('gstech-core/modules/logger');
const { addEvent } = require('./PlayerEvent');
const { get } = require('./Player');
const { addPlayerFraud } = require('../frauds');

const PLAYERS = 'players';

const badLoginsToTemporarilyBlockLogins = 3;
const minutesToTemporarilyBlockLogins = 15;
const badLoginsToBlockAccount = 5;

const checkPassword = async (password: string, hash: string) => {
  if (hash.indexOf(':') !== -1 && hash.length !== 60) {
    const [h, salt] = hash.split(':');
    const expected = crypto.createHash('sha256').update(salt + password).digest('hex').toUpperCase();
    return expected === h;
  }
  const result = await bcrypt.compare(password, hash);
  return result;
};

const trackSuccessfulLogin = (id: Id): Promise<void> => pg(PLAYERS).update({ badLoginCount: 0, lastLogin: pg.raw('now()') }).where({ id });

const trackBadLogin = async (id: Id) => {
  const [{ badLoginCount }] = await pg(PLAYERS)
    .update({
      badLoginCount: pg.raw('"badLoginCount" + 1'),
      lastBadLogin: pg.raw('now()'),
    })
    .where({ id })
    .returning('badLoginCount');

  if (badLoginCount >= badLoginsToBlockAccount) {
    await pg(PLAYERS).update({ loginBlocked: true }).where({ id });
    await addPlayerFraud(id, 'login_blocked', moment().format('YYYYMMDD'), {});
    await addEvent(id, undefined, 'account', 'tooManyLogins');
  }
};

const doAuthenticate = async (id: Id, player: any, ipAddress: IPAddress, valid: boolean) => {
  const { loginBlocked, lastBadLogin, badLoginCount } = player;
  if (loginBlocked) {
    return Promise.reject({ error: errorCodes.LOGIN_BLOCKED });
  }

  if (badLoginCount >= badLoginsToTemporarilyBlockLogins
      && moment().diff(moment(lastBadLogin), 'minutes') <= minutesToTemporarilyBlockLogins
  ) {
    await addEvent(id, undefined, 'account', 'invalidLoginAttemptBlocked', { IPAddress: ipAddress });
    if (!valid) {
      await trackBadLogin(id);
    }
    return Promise.reject({ error: errorCodes.LOGIN_TEMPORARILY_BLOCKED });
  }

  if (!valid) {
    await trackBadLogin(id);
    await addEvent(id, undefined, 'activity', 'invalidLoginAttempt', { IPAddress: ipAddress });
    return Promise.reject({ error: errorCodes.INVALID_LOGIN_DETAILS });
  }

  await trackSuccessfulLogin(id);
  return get(id);
};

const authenticateByMobilePhone = async (brandId: string, mobilePhone: string, ipAddress: IPAddress): | Promise<any>
  | Promise<
    {
      activated: boolean,
      additionalFields?: any,
      address: string,
      brandId: BrandId,
      city: string,
      countryId: string,
      createdAt: Date,
      currencyId: string,
      dateOfBirth: string,
      email: string,
      firstName: string,
      id: number,
      languageId: string,
      lastName: string,
      mobilePhone: string,
      nationalId: ?string,
      nationality?: string,
      placeOfBirth?: string,
      postCode: string,
      tcVersion: number,
      testPlayer: boolean,
      username: string,
      verified: boolean,
    },> => {
  const phone = parse(mobilePhone);
  if (phone === null) {
    logger.warn('authenticateByMobilePhone failed, invalid phone number', mobilePhone);
    return Promise.reject({ error: errorCodes.INVALID_PHONE_NUMBER });
  }
  const player = await pg(PLAYERS).first('id', 'loginBlocked', 'accountClosed', 'accountSuspended', 'lastBadLogin', 'badLoginCount').where({
    brandId,
    accountClosed: false,
    accountSuspended: false,
    mobilePhone: phone,
  });

  if (!player) {
    logger.warn('authenticateByMobilePhone failed, player not found', { brandId, mobilePhone });
    return Promise.reject({ error: errorCodes.INVALID_LOGIN_DETAILS });
  }
  const { id } = player;
  const result = await doAuthenticate(id, player, ipAddress, true);
  await addEvent(id, undefined, 'activity', 'authenticate', { IPAddress: ipAddress });
  return result;
};

const authenticate = async (brandId: string, email: string, password: string, ipAddress: IPAddress): | Promise<any>
  | Promise<
    {
      activated: boolean,
      additionalFields?: any,
      address: string,
      brandId: BrandId,
      city: string,
      countryId: string,
      createdAt: Date,
      currencyId: string,
      dateOfBirth: string,
      email: string,
      firstName: string,
      id: number,
      languageId: string,
      lastName: string,
      mobilePhone: string,
      nationalId: ?string,
      nationality?: string,
      placeOfBirth?: string,
      postCode: string,
      tcVersion: number,
      testPlayer: boolean,
      username: string,
      verified: boolean,
    },> => {
  const player = await pg(PLAYERS).first('hash', 'id', 'loginBlocked', 'accountClosed', 'accountSuspended', 'lastBadLogin', 'badLoginCount').where({
    brandId,
    accountClosed: false,
    accountSuspended: false,
  }).whereRaw('lower("email") = ?', email.toLowerCase());
  if (!player) {
    return Promise.reject({ error: errorCodes.INVALID_LOGIN_DETAILS });
  }

  const { hash, id, loginBlocked } = player;
  if (loginBlocked) {
    return Promise.reject({ error: errorCodes.LOGIN_BLOCKED });
  }
  const valid = await checkPassword(password, hash);
  const result = await doAuthenticate(id, player, ipAddress, valid);
  await addEvent(id, undefined, 'activity', 'login', { IPAddress: ipAddress });
  return result;
};

const resetPassword = async (id: Id, newPassword: string, tx: Knex$Transaction<void>): Promise<void> => {
  const hash = await bcrypt.hash(newPassword, 10);
  await addEvent(id, null, 'activity', 'passwordChanged').transacting(tx);

  return await tx(PLAYERS).update({ hash, badLoginCount: 0 }).where({ id }).whereNot('email', newPassword);
};


const changePassword = async (id: Id, oldPassword: string, newPassword: string): Promise<any> | Promise<boolean> => {
  const player = await pg(PLAYERS).first('hash').where({ id });
  if (!player) {
    return Promise.reject({ error: errorCodes.INVALID_LOGIN_DETAILS });
  }
  const valid = await checkPassword(oldPassword, player.hash);

  if (!valid) {
    return Promise.reject({ error: errorCodes.INVALID_OLD_PASSWORD });
  }

  await pg.transaction(async tx => {
    await resetPassword(id, newPassword, tx);
    await addEvent(id, null, 'activity', 'passwordChanged').transacting(tx);
  });

  return true;
};

const setPassword = async (id: Id, newPassword: string): Promise<any> | Promise<boolean> => {
  const player = await pg(PLAYERS).first('id','hash','email').where({ id });
  if (!player) {
    return Promise.reject({ error: errorCodes.INVALID_LOGIN_DETAILS });
  }

  if (player.hash != null){
    return Promise.reject({ error: errorCodes.PASSWORD_ALREADY_SET });
  }

  if (player.email === newPassword){
    return Promise.reject({ error: errorCodes.PASSWORD_CANNOT_EQUAL_EMAIL });
  }

  await pg.transaction(async tx => {
    const passHash = await bcrypt.hash(newPassword, 10);
    await addEvent(id, null, 'activity', 'passwordSet').transacting(tx);
    await tx(PLAYERS).update({ hash: passHash, badLoginCount: 0 }).where({ id });
  });

  return true;
};

module.exports = { trackSuccessfulLogin, authenticate, authenticateByMobilePhone, changePassword, setPassword, resetPassword };
