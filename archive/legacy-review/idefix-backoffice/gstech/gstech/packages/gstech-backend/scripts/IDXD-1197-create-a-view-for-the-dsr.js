/* eslint-disable no-plusplus */
// @flow
const { DateTime } = require('luxon');
const logger = require('gstech-core/modules/logger');
const DSRUpdateJob = require('../server/modules/reports/jobs/DSRUpdateJob');

(async (): Promise<?any> => {
  const startDate = DateTime.fromFormat('2024-05-10', 'yyyy-MM-dd');
  const endDate = DateTime.fromFormat('2024-06-25', 'yyyy-MM-dd');

  for (let i = 0; i < endDate.diff(startDate, 'days').days; i++) {
    const date = startDate.plus({ days: i });
    logger.info(`DSR Update for ${date.toFormat('yyyy-MM-dd')}`);
    await DSRUpdateJob.update(date.toJSDate());
  }
})()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
