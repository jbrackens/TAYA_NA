/* @flow */
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');

const minutesForActiveCode = 10;

const addCode = (userId: Id, code: number, ipAddress: IPAddress): Promise<void> =>
  pg('user_verification_codes')
    .insert({ userId, code, ipAddress });

const makeExpired = (code: number, userId: Id): Promise<void> =>
  pg('user_verification_codes').update({ status: 'expired' }).where({ code, userId, status: 'active' });

const checkCode = async (confirmationCode: number, userId: Id): Promise<any> | Promise<boolean> => {
  const code = await pg('user_verification_codes').first('createdAt', 'code').where({ code: confirmationCode, status: 'active', userId });

  if (!code) {
    return Promise.reject({ message: 'Invalid confirmation code' });
  }

  const { createdAt } = code;

  if (moment().diff(moment(createdAt), 'minutes') > minutesForActiveCode) {
    await makeExpired(confirmationCode, userId);
    return Promise.reject({ message: 'Code is expired' });
  }

  return true;
};

module.exports = { addCode, checkCode, makeExpired };
