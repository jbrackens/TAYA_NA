/* @flow */
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');

const client = require('gstech-core/modules/clients/complianceserver-api');
const { applyMultipleSanction } = require('../../frauds');
const { addEvent } = require('../index');

const run = async () => {
  const chunkSize = 10_000;
  const dailyChecks = await pg('players')
    .with('pes', (qb) => {
      qb.select('playerId', 'key')
        .from('player_events')
        .where('key', '=', 'sanctionCheck')
        .where('createdAt', '>', pg.raw(`now() - interval '1 day'`));
    })
    .select({ playerId: 'id', name: pg.raw(`"firstName" || ' ' || "lastName"`) })
    .leftJoin('pes', 'pes.playerId', '=', 'players.id')
    .whereNull('pes.key')
    .limit(chunkSize);

  logger.info(`+++ RunDailySanctionChecksJob - checking ${dailyChecks.length} players for sanctions.`);

  for (const { playerId, name } of dailyChecks) {
    try {
      const sanctionCheckResult = await client.checkMultipleSanction({ name });
      const lists = Object.entries(sanctionCheckResult.metadata).map(([key, value]) => `${key}/${String(value)}`);
      await addEvent(playerId, null, 'account', 'sanctionCheck', { lists, ...sanctionCheckResult });

      if (sanctionCheckResult.matched) {
        await applyMultipleSanction(playerId, sanctionCheckResult);
      }
    } catch (err) {
      logger.error('XXX RunDailySanctionChecksJob', { playerId, name, err });
    }
  }
};

module.exports = { run };
