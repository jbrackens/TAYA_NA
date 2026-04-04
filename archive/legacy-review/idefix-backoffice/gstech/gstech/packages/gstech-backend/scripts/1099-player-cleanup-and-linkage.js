// @flow

// to run this use: yarn workspace gstech-backend script:runner 1099-player-cleanup-and-linkage
// add --dryrun to test without committing changes:
// yarn workspace gstech-backend script:runner 1099-player-cleanup-and-linkage --dryrun

const logger = require('gstech-core/modules/logger');

const {
  closeSuspendedAccounts,
  linkAccounts,
  syncVerificationStatus,
  handleAbuseAccounts,
  handleGamblingProblemAccounts,
  handlePepAccounts,
  cleanUpPersonIds,
  triggerFraudTasks,
} = require('./1099-player-cleanup-and-linkage-functions');

(async (): Promise<any> => {
  logger.info('+++ 1099 [START] Player Account Cleanup and Linkage');
  const isDryRun = !!process.argv.find((arg) => arg === '--dryrun');
  if (isDryRun) {
    logger.info('+++ 1099 Dry run mode enabled, no changes will be made to the database');
  }
  await closeSuspendedAccounts(isDryRun);
  await linkAccounts(isDryRun);
  await syncVerificationStatus(isDryRun);
  await handleAbuseAccounts(isDryRun);
  await handleGamblingProblemAccounts(isDryRun);
  await handlePepAccounts(isDryRun);
  await cleanUpPersonIds(isDryRun);
  await triggerFraudTasks(isDryRun);
})()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('XXX 1099 [ERROR]', error);
    process.exit(1);
  });
