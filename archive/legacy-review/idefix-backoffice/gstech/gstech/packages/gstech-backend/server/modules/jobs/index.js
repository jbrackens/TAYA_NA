/* @flow */
const logger = require('gstech-core/modules/logger');

const executeJob = (description: string, job: () => Promise<any>): (() => Promise<void>) => async () => {
  logger.info('Running job', description);
  const hrstart = process.hrtime();
  try {
    await job();
    const [end, endns] = process.hrtime(hrstart);
    logger.info(`Job ${description} finished in ${end}s ${endns / 1000000}ms`);
  } catch (e) {
    logger.error('Job execution failed', description, e);
  }
};


module.exports = { executeJob };
