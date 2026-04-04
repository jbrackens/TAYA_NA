/* @flow */
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const { maximumPasswordAge } = require('../users/User');

const report = async (): Promise<any> => {
  const users = await pg('users').select('*').orderBy('accountClosed').orderBy('name');
  return users.map(user => ({ ...user, passwordExpires: moment(user.lastPasswordReset).add(maximumPasswordAge, 'days').toDate() }));
};

module.exports = { report };
