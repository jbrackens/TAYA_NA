/* @flow */
require('flow-remove-types/register');

const moment = require('moment-timezone');
const { update } = require('../server/modules/reports/jobs/GameTurnoverUpdateJob');

(async () => {
  await update(moment(new Date('2022-10-25')));

  process.exit();
})();
