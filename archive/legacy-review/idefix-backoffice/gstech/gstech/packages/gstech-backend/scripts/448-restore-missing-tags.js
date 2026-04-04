/* @flow */

const _ = require('lodash');
const promiseLimit = require('promise-limit');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { addTag } = require('../server/modules/players/Player');
const tagsToRestore = require('./assets/448-tags-to-restore.json');
const savedTagTimestamps = require('./assets/448-saved-tag-timestamps.json');

const limit = promiseLimit(2);

(async () => {
  const ops = [];

  for (const [tagToRestore, playerIds] of _.entries(tagsToRestore)) {
    logger.info(`Restoring tag '${tagToRestore}'`);
    for (const playerId of playerIds) {
      const savedTs =
        savedTagTimestamps[playerId] && savedTagTimestamps[playerId][tagToRestore]
          ? savedTagTimestamps[playerId][tagToRestore]
          : undefined;
      ops.push(async (pId: empty = playerId, tTr: string = tagToRestore, sTs: void | string = savedTs): any => {
        logger.info(`${pId} [${tTr}]`);
        try {
          return await pg.transaction(async (tx) => {
            await addTag(pId, tTr, sTs, tx);
            logger.info(`${pId} [${tTr}] -> DONE`);
          });
        } catch (err) {
          logger.error(`${pId} [${tTr}] -> ERROR`, err);
          return false;
        }
      });
    }
  }

  await Promise.all(ops.map((op) => limit(() => op())));
  process.exit();
})();
