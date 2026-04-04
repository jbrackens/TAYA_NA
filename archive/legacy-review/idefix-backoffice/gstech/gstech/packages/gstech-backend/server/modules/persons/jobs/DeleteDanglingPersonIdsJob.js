/* @flow */
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');

const run = async () => {
  logger.info(`+++ DeleteDanglingPersonIdsJob.run() started`);
  const danglingPersonIdsFromPlayersQuery = pg('players')
    .select('personId')
    .groupBy('personId')
    .having(pg.raw('COUNT(*) = 1'));

  const danglingPersonIds = await danglingPersonIdsFromPlayersQuery;
  if (danglingPersonIds.length > 0)
    logger.info(`++++ DeleteDanglingPersonIdsJob.run(). Dangling personIds:`, {
      danglingPersonIds,
    });
  for (const { personId } of danglingPersonIds) {
    await pg.transaction(async (tx) => {
      const updatedPlayers = await tx('players')
        .where({ personId })
        .update({ personId: null })
        .returning(['id', 'username']);
      await tx('persons').where({ id: personId }).del();
      logger.info(
        `+++++ DeleteDanglingPersonIdsJob.run() - deleted personId=${personId}, and cleaned player(s)`,
        { updatedPlayers },
      );
    });
  }

  const orphanPersonIds = await pg('persons')
    .select('persons.id')
    .leftJoin('players', 'persons.id', 'players.personId')
    .whereNull('players.personId');
  if (orphanPersonIds.length > 0)
    logger.info(`++++ DeleteDanglingPersonIdsJob.run(). Orphan persons ids:`, { orphanPersonIds });
  for (const { id } of orphanPersonIds) {
    await pg('persons').where({ id }).del();
    logger.info(`+++++ DeleteDanglingPersonIdsJob.run() - deleted orphan persons.id=${id}`);
  }
  logger.info(`+++ DeleteDanglingPersonIdsJob.run() completed.`);
};

module.exports = { run };
