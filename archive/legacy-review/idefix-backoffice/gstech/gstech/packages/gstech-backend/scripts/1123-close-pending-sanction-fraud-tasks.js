// @flow

// to run this use: yarn workspace gstech-backend script:runner 1123-close-pending-sanction-fraud-tasks
// add --dryrun to test without committing changes:
// yarn workspace gstech-backend script:runner 1123-close-pending-sanction-fraud-tasks --dryrun

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const logPrefix = '1123';

const closePendingSanctionFraudTasks = async (isDryRun: boolean) => {
  await pg.transaction(async (tx) => {
    try {
      logger.info(`+++${logPrefix} Running script...`);
      const { rowCount } = await tx.raw(
        `UPDATE player_frauds SET checked = true, cleared = true, "checkedAt" = NOW() WHERE "fraudKey" = 'sanction_list_check' AND "checked" = false`,
      );
      logger.info(`+++${logPrefix} Updated ${rowCount} fraud tasks`);
      if (isDryRun) {
        await tx.rollback();
        logger.info(`+++${logPrefix} [SUCCESS] [ROLLEDBACK] [DRYRUN]`);
      } else {
        await tx.commit();
        logger.info(`+++${logPrefix} [SUCCESS] [COMMITED]`);
      }
    } catch (error) {
      logger.error(`XXX${logPrefix} [ERROR]`, error);
      throw error;
    }
  });
};

(async (): Promise<any> => {
  const isDryRun = !!process.argv.find((arg) => arg === '--dryrun');
  await closePendingSanctionFraudTasks(isDryRun);
})()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(`XXX${logPrefix} [ERROR]`, error);
    process.exit(1);
  });
