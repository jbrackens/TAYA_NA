// @flow

import type { Fraud } from '../server/modules/frauds/Fraud';

const moment = require('moment');

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const { getUnchecked, check } = require(`../server/modules/frauds/Fraud`);
const { addNote } = require('../server/modules/players/PlayerEvent');

const selectedPlayerIds = [
  3960902, 3961456, 3960852, 3960824, 3960450, 3960071, 3959620, 3959614, 3959605, 3959594, 3959584, 3960076, 3961273, 3961252, 3961280,
  3961240, 3961263, 3961250, 3961071, 3961246, 3961069, 3961238, 3961061, 3961081, 3960791, 3961077, 3960731, 3961073, 3960432, 3961066,
  3960306, 3960305, 3960795, 3959626, 3960793, 3959602, 3960733, 3960729, 3959581, 3959580, 3960471, 3960449, 3960309, 3959627, 3959615,
  3959612, 3959611, 3960315, 3960827, 3959624, 3959609, 3959583, 3961451, 3961027,
];
const userId = 1339; // Ambrose Muscat

const clearNewPlayerPossibleLinkedFraudTasks = async () => {
  const selectResult = await pg('players').select('id').whereIn('id', selectedPlayerIds);
  const playerIds = selectResult.map((row) => row.id);
  const total = playerIds.length;
  logger.info(`+++ 1005 [START] [${total} players to update]`);
  const startTime = Date.now();
  let fraudCounter = 0;
  try {
    for (const [index, playerId] of playerIds.entries()) {
      const progress = ((index / total) * 100).toFixed(2);
      const logPrefix = `+++ 1005 [${progress}% (${index + 1}/${total})] [playerId: ${playerId}]`;
      try {
        const resolution = `The fraud task 'new_player_possible_linked' has been automatically cleared because the player involved is identified as a campaign abuser, with their accounts either being closed or suspended, and their current balance standing at 0. This action of automated clearance received approval from the compliance team.`;
        const uncheckedFrauds = await getUnchecked(playerId);
        const selectedFrauds = uncheckedFrauds.filter((fraud: Fraud) => fraud.fraudKey === 'new_player_possible_linked');
        for (const [idx, fraud] of selectedFrauds.entries()) {
          const innerTotal = selectedFrauds.length;
          const innerProgress = ((idx / innerTotal) * 100).toFixed(2);
          await check(fraud.id, userId, false, resolution);
          fraudCounter += 1;
          logger.info(`${logPrefix} [${innerProgress}% (${idx + 1}/${innerTotal})] [CHECKED] [fraudId: ${fraud.id}]`);
        }
        await addNote(playerId, userId, resolution);
        logger.info(`${logPrefix} [100.00% DONE]`);
      } catch (error) {
        logger.error(`${logPrefix} [ERROR]`, error);
        throw error;
      }
    }
    logger.info(`+++ 1005 [100.00% SUCCESS] [${playerIds.length} players updated] [${fraudCounter} frauds checked]`);
  } catch (error) {
    logger.error('+++ 1005 [ERROR]', error);
    throw error;
  }
  const endTime = Date.now();
  const executionTime = endTime - startTime;
  const formattedExecutionTime = moment.utc(executionTime).format('HH:mm:ss.SSS');

  logger.info(`+++ 1005 [END] [Took ${formattedExecutionTime}]`);
};

(async (): Promise<any> => {
  await clearNewPlayerPossibleLinkedFraudTasks();
})()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

/**
 * SQL to get the playerIds list:
 * 
    SELECT "playerId"
    FROM (
        SELECT count(player_frauds.id) AS fraud_count, 
            player_frauds."playerId"
        FROM player_frauds
        INNER JOIN players ON players.id = player_frauds."playerId"
        WHERE player_frauds.checked = FALSE 
        AND (players."accountSuspended" = TRUE OR players."accountClosed" = TRUE)
        AND players.balance = 0
        AND player_frauds."fraudKey" = 'new_player_possible_linked'
        GROUP BY player_frauds."playerId"
    ) AS cte
    WHERE fraud_count > 7
    ORDER BY fraud_count DESC;
*/
