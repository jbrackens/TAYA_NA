/* @flow */
const bcrypt = require('bcrypt');
const moment = require('moment-timezone');
const crypto = require('crypto');
const pg = require('gstech-core/modules/pg');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const { addEvent } = require('./UserEvent');
const { makeExpired, checkCode } = require('./UserVerificationCode');

const badLoginsToBlockAccount = 5;
const badLoginsToTemporarilyBlockLogins = 3;
const minutesToTemporarilyBlockLogins = 15;
const maximumPasswordAge = 42;

const USERS = 'users';

const checkPassword = async (password: string, hash: string) => {
  if (hash.indexOf(':') !== -1) {
    const [h, salt] = hash.split(':');
    const expected = crypto.createHash('sha256').update(salt + password).digest('hex').toUpperCase();
    return expected === h;
  }
  return bcrypt.compare(password, hash);
};

export type AccessSettings = {
  accountClosed: boolean,
  administratorAccess: boolean,
  paymentAccess: boolean,
  reportingAccess: boolean,
  loginBlocked: boolean,
  requirePasswordChange: boolean,
  campaignAccess: boolean,
  riskManager: boolean,
};

export type UserDraft = {
  email: string,
  handle: string,
  name: string,
  mobilePhone: string,
};

export type User = {
  id: Id,
  createdAt: Date,
  lastSeen: Date,
  lastPasswordReset: Date
} & AccessSettings & UserDraft;

const trackSuccessfulLogin = (id: Id) => pg(USERS).update({ badLoginCount: 0, lastSeen: pg.raw('now()') }).where({ id });

const trackBadLogin = async (id: Id) => {
  const [{ badLoginCount }] = await pg(USERS).update({
    badLoginCount: pg.raw('"badLoginCount" + 1'),
    lastBadLogin: pg.raw('now()'),
  }).where({ id }).returning('badLoginCount');

  if (badLoginCount >= badLoginsToBlockAccount) {
    await pg(USERS).update({ loginBlocked: true }).where({ id });
  }
};

const authenticate = async (email: string, password: string, ipAddress: IPAddress): Promise<any> => {
  const user = await pg(USERS)
    .first('hash', 'id', 'requirePasswordChange', 'badLoginCount', 'loginBlocked', 'lastBadLogin', 'lastPasswordReset')
    .where({ email });
  if (user != null) {
    const valid = await checkPassword(password, user.hash);
    if (!valid) {
      await addEvent(pg, user.id, 'Invalid login attempt', {}, ipAddress);
      await trackBadLogin(user.id);
      return Promise.reject(errorCodes.INVALID_LOGIN_DETAILS);
    }

    if (user.loginBlocked) {
      return Promise.reject(errorCodes.LOGIN_BLOCKED);
    }

    if (user.badLoginCount >= badLoginsToTemporarilyBlockLogins
        && moment().diff(moment(user.lastBadLogin), 'minutes') <= minutesToTemporarilyBlockLogins
    ) {
      await addEvent(pg, user.id, 'Invalid login attempt - login temporary blocked', {}, ipAddress);
      return Promise.reject(errorCodes.LOGIN_TEMPORARILY_BLOCKED);
    }

    await addEvent(pg, user.id, 'Successful login', {}, ipAddress);
    await trackSuccessfulLogin(user.id);
    if (user.requirePasswordChange || moment().diff(moment(user.lastPasswordReset), 'days') > maximumPasswordAge) {
      return Promise.reject(errorCodes.PASSWORD_EXPIRED);
    }

    return user;
  }
  return Promise.reject(errorCodes.INVALID_LOGIN_DETAILS);
};

const setPassword = async (id: Id, password: string) => {
  const hash = await bcrypt.hash(password, 10);
  await pg(USERS).update({ hash, requirePasswordChange: false, lastPasswordReset: pg.raw('now()') }).where({ id });
};

const expirePassword = async (id: Id): Promise<any> => pg(USERS).update({ requirePasswordChange: true }).where({ id });

const changePassword = async (email: string, oldPassword: string, newPassword: string): Promise<any> | Promise<boolean> => {
  const user = await pg('users').where({ email }).first('*');
  const valid = await checkPassword(oldPassword, user.hash);

  if (!valid) {
    await trackBadLogin(user.id);
    return Promise.reject(errorCodes.INVALID_LOGIN_DETAILS);
  }

  if (oldPassword === newPassword) {
    return Promise.reject(errorCodes.UNABLE_TO_SET_SAME_PASSWORD_AGAIN);
  }

  if (email === newPassword) {
    return Promise.reject(errorCodes.PASSWORD_CANNOT_EQUAL_EMAIL);
  }

  await setPassword(user.id, newPassword);
  return true;
};

const get = (): Promise<User> =>
  pg('users').select(
    'id',
    'accountClosed',
    'administratorAccess',
    'reportingAccess',
    'loginBlocked',
    'requirePasswordChange',
    'email',
    'handle',
    'name',
    'mobilePhone',
    'createdAt',
    'lastSeen',
    'lastPasswordReset',
  ).orderBy('handle');

const getById = (userId: Id): Knex$QueryBuilder<User> => pg('users').where({ id: userId }).first('*');

const updateAccessSettings = async (userId: Id, accessSettingsDraft: AccessSettings, ipAddress: IPAddress, createdBy: Id): Promise<AccessSettings> => {
  const settings = await pg.transaction(async (tx) => {
    await addEvent(tx, userId, 'User access updated', accessSettingsDraft, ipAddress, createdBy);
    return tx('users')
      .update(accessSettingsDraft)
      .update({ badLoginCount: 0 })
      .where({ id: userId })
      .returning([
        'accountClosed',
        'administratorAccess',
        'paymentAccess',
        'reportingAccess',
        'campaignAccess',
        'loginBlocked',
        'requirePasswordChange',
        'riskManager',
      ])
      .then(([accessSettings]) => accessSettings);
  });

  return settings;
};

const create = (userDraft: UserDraft): any =>
  pg('users').insert(userDraft)
    .returning('*') // TODO do not return *
    .then(([user]) => user);

const update = (userId: Id, userDraft: UserDraft): any =>
  pg('users')
    .update(userDraft)
    .where({ id: userId })
    .returning('*') // TODO do not return *
    .then(([user]) => user);

const getByEmail = async (email: string): Promise<User> => {
  const user = await pg('users').where({ email }).first('*');

  if (user != null) {
    return user;
  }

  return Promise.reject({ message: `User is not found: ${email}` });
};

const resetPassword = async (email: string, code: number, newPassword: string): Promise<boolean> => {
  const user = await getByEmail(email);

  await checkCode(code, user.id);
  await makeExpired(code, user.id);
  await setPassword(user.id, newPassword);
  return true;
};

const getUserRoles = async (userId: Id): Promise<string[]> => {
  // TODO this would be better to do in db
  const user = await pg('users').first('*').where({ id: userId });
  const userRoles = ['agent'];
  if(user.administratorAccess)userRoles.push('administrator');
  if(user.riskManager)userRoles.push('riskManager');
  if(user.paymentAccess)userRoles.push('payments');
  return userRoles;
};

module.exports = {
  authenticate,
  changePassword,
  getById,
  getByEmail,
  get,
  updateAccessSettings,
  create,
  update,
  maximumPasswordAge,
  expirePassword,
  resetPassword,
  getUserRoles,
};
