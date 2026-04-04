// @flow
import type { JobQueue } from 'gstech-core/modules/queue';
import type { Affiliate } from '../types/repository/affiliates';
import type { Player } from './modules/admin/affiliates/players/repository';

const { createQueue } = require('gstech-core/modules/queue');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const operations = require('./operations');

export type CloseMonthQueue = {
  affiliateId: Id,
  floorBrandCommission: boolean,
  year: number,
  month: number,
  userId: Id,
};

export type UpdatePlayersQueue = {
  affiliate: Affiliate,
  player: Player,
  year: number,
  month: number,
};

const closeMonthQueue: JobQueue<CloseMonthQueue> = createQueue<CloseMonthQueue>('closeMonthQueue');
const updatePlayersQueue: JobQueue<UpdatePlayersQueue> = createQueue<UpdatePlayersQueue>('updatePlayersQueue');

closeMonthQueue.process(async (job) => {
  const { affiliateId, floorBrandCommission, year, month, userId } = job.data;
  logger.debug(`Closing month ${year}-${month} for affiliateId '${affiliateId}'`);
  await pg.transaction(tx => operations.closeAffiliateMonth(tx, affiliateId, floorBrandCommission, year, month, userId));
});

updatePlayersQueue.process(async (job) => {
  const { affiliate, player, year, month } = job.data;

  logger.debug(`Updating ${year}-${month} for playerId '${player.id}'`);

  try {
    await pg.transaction(async tx => {
      await operations.updatePlayersCommission(tx, affiliate, player, year, month);
      await operations.updateAffiliateCommission(tx, affiliate.id, year, month);
    });
  } catch (e) {
    logger.error(`updatePlayersQueue failed`, { affiliate, player, year, month }, e);
  }
});

module.exports = {
  closeMonthQueue,
  updatePlayersQueue,
};
