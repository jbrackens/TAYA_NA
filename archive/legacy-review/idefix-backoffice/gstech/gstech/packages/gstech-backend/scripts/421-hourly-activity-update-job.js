/* @flow */
require('flow-remove-types/register');

const moment = require('moment-timezone');
const { update } = require('../server/modules/reports/jobs/HourlyActivityUpdateJob');

(async () => {
  const start = new Date('2022-10-25');
  const end = new Date('2022-10-26 19:00:00');

  for (const m = moment(start); m.isBefore(end); m.add(1, 'hours')) {
    await update(m);
  }

  process.exit();
})();
