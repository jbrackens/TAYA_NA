/* @flow */
const cronCluster = require('cron-cluster');

const redis = require('./redis');
const logger = require('./logger');

const { CronJob } = cronCluster(redis.createClient());

const executeJob = (description: string, job: () => Promise<mixed>) => async () => {
  logger.info(`Job '${description}' started`);
  const hrstart = process.hrtime();
  try {
    await job();
    const [end, endns] = process.hrtime(hrstart);
    logger.info(`Job '${description}' finished in ${end}s ${endns / 1000000}ms`);
  } catch (e) {
    logger.error(`Job '${description}' failed`, e);
  }
};

const startJob = async (pattern: string, description: string, jobHandler: () => Promise<mixed>) => {
  logger.info(`Scheduling job '${description}' to run at '${pattern}'`);

  const job = new CronJob(pattern, executeJob(description, jobHandler));
  job.start();
};

module.exports = { startJob };
