// @flow

// to run this use: yarn workspace gstech-backend script:runner 1205-fix-small-remaining-balances
// add --dryrun to test without committing changes:
// yarn workspace gstech-backend script:runner 1205-fix-small-remaining-balances --dryrun

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const { addTransaction } = require('../server/modules/payments/Payment');
const { addNote } = require('../server/modules/players/PlayerEvent');

const thresholdInEuro = 5;

const logInfo = (text: string, args?: any) => {
  if (args) logger.info(`+++ 1205 ${text}`, args);
  else logger.info(`+++ 1205 ${text}`);
};

const logDebug = (text: string, args?: any) => {
  if (args) logger.debug(`+++ 1205 ${text}`, args);
  else logger.debug(`+++ 1205 ${text}`);
};

const logError = (text: string, args?: any) => {
  if (args) logger.error(`XXX 1205 ${text}`, args);
  else logger.error(`XXX 1205 ${text}`);
};

const zeroSmallRemainingBalancesInClosedAccounts = async (isDryRun: boolean) => {
  let list;
  try {
    await pg.transaction(async (tx) => {
      list = await tx.raw(`
SELECT 
    p.id,
    p.username,
    p.balance,
    p."currencyId"
FROM
    players p
INNER JOIN 
    conversion_rates cr 
ON 
    p."currencyId" = cr."currencyId"
WHERE 
    p.balance > 0 
    AND NOT p."testPlayer" 
    AND "accountSuspended"
    AND (p.balance / cr."conversionRate" / 100 <= ${thresholdInEuro})
`);
    });
  } catch (error) {
    logError('zeroSmallRemainingBalancesInClosedAccounts - ERROR', error);
  }
  if (!list) {
    logError('zeroSmallRemainingBalancesInClosedAccounts - The initial query failed. Exiting...');
    return;
  }
  const { rows, rowCount } = list;
  if (rowCount === 0) {
    logInfo('zeroSmallRemainingBalancesInClosedAccounts - END - No accounts to zero balance');
    return;
  }
  logInfo(`zeroSmallRemainingBalancesInClosedAccounts - Found ${rowCount} players to correct with less than ${thresholdInEuro} EUR as balance`, rows);
  const batchSize = 100;
  const total = rows.length;
  try {
    await pg.transaction(async (tx) => {
      for (let i = 0; i < total; i += batchSize) {
        const batchRows = rows.slice(i, i + batchSize);
        logInfo(`zeroSmallRemainingBalancesInClosedAccounts - Processing batch ${i} to ${i + batchSize}`, batchRows);
        for (const [index, row] of batchRows.entries()) {
          const { id, username, balance, currencyId } = row;
          const idx = i + index;
          const progress = `zeroSmallRemainingBalancesInClosedAccounts - [${((idx / total) * 100).toFixed(2)}% ${idx}/${total}]`;
          const formattedBalance = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyId,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(balance / 100);
          logDebug(`${progress} Processing info for playerId ${id} username ${username} ${formattedBalance}`, { balance, currencyId });
          const note = `There was an automatic correction of “${formattedBalance}” to this account related to ticket IDXD-1205.`;
          await addTransaction(id, null, 'correction', -balance, note, null, tx);
          await addNote(id, null, note, tx);
        }
        logDebug(`zeroSmallRemainingBalancesInClosedAccounts - [100.00%] Finished ${total} corrections`);
      }
      if (isDryRun) {
        await tx.rollback();
        logInfo(`zeroSmallRemainingBalancesInClosedAccounts - ROLLBACK Successful`);
      } else {
        await tx.commit();
        logInfo(`zeroSmallRemainingBalancesInClosedAccounts - COMMIT Successful`);
      }
    });
  } catch (error) {
    logError('zeroSmallRemainingBalancesInClosedAccounts - failed:', error);
  }
};

(async (): Promise<any> => {
  logger.info('+++ 1205 [START] Automated Job for Zeroing Small Remaining Balances in Closed Player Accounts');
  const isDryRun = !!process.argv.find((arg) => arg === '--dryrun');
  if (isDryRun) {
    logger.info('+++ 1205 Dry run mode enabled, no changes will be made to the database');
  }
  await zeroSmallRemainingBalancesInClosedAccounts(isDryRun);
})()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('XXX 1205 [ERROR]', error);
    process.exit(1);
  });
