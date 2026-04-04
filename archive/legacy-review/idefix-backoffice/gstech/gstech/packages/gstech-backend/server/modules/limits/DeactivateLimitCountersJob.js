/* @flow */
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');

const update = async () => {
  const week = Number(moment().format('YYYYWW'));
  const month = Number(moment().format('YYYYMM'));
  const date = Number(moment().format('YYYYMMDD'));

  await pg('player_counters')
    .update({ active: false })
    .where({ active: true })
    .whereRaw('week < ? and month < ? and date < ?', [week, month, date]);
};

module.exports = { update };
