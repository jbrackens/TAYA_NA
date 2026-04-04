// @flow
require('flow-remove-types/register');

const { DateTime } = require('luxon');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const affiliatesRepository = require('../server/modules/admin/affiliates/repository');

const operations = require('../server/operations');
const playersRepository = require('../server/modules/admin/affiliates/players/repository');

// TODO: this seems to be dead code. check and remove
const updatePlayers = async (date: DateTime = DateTime.local()) => {
  const affiliates = await affiliatesRepository.getActiveAffiliates(pg, date.year, date.month);
  logger.debug('updatePlayers affiliates', affiliates.length);
  for (const affiliate of affiliates) {
    await pg.transaction(async (tx) => {
      logger.debug('updatePlayers affiliate', affiliate.id);
      try {
        const players = await playersRepository.getActivePlayers(
          tx,
          affiliate.id,
          date.year,
          date.month,
        );
        for (const player of players)
          await operations.updatePlayersCommission(tx, affiliate, player, date.year, date.month);

        await operations.updateAffiliateCommission(tx, affiliate.id, date.year, date.month);
      } catch (e) {
        logger.error(
          `updatePlayers > updateAffiliateCommission: failed for affiliateId '${affiliate.id}'`,
          e,
        );
      }
    });
  }
};

module.exports = updatePlayers;
