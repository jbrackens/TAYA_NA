/* @flow */
const moment = require('moment-timezone');

const pg = require('gstech-core/modules/pg');

const report = async (date: Date, brandId: string): Promise<any> => {
  const h = moment(date).format('YYYY-MM-DD HH:mm:ss');
  const result = pg('players')
    .select([
      pg.raw('id::text as "playerId"'),
      'countryId as countryCode',
      'affiliateRegistrationCode as bannerTag',
      'ipAddress as registrationIP',
      'createdAt as registrationDate',
      'username as username',
    ])
    .whereRaw(`"createdAt" between
      date_trunc('day', '${h}' AT TIME zone 'Europe/Rome')
      AND date_trunc('day', '${h}' AT TIME zone 'Europe/Rome') + '1 day'::INTERVAL - '1 usec'::INTERVAL`)
    .whereNotNull('affiliateRegistrationCode')
    .where({ brandId })
    .orderBy('createdAt');
  return result;
};

module.exports = { report };
