/* @flow */
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');

const availableMonths = async (playerId: Id): Promise<any> => {
  const { rows } = await pg.raw(`select date_trunc('month', hour) as month from report_hourly_players where hour >= date_trunc('month', now() - '6 months'::interval) and "playerId"=? group by date_trunc('month', hour) order by date_trunc('month', hour) desc`, playerId);  
  return rows.map(({ month }) => moment(month).format('YYYYMM'));
};

module.exports = { availableMonths };
