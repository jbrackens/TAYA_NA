/* @flow */

import type { LedgerWithRewardAndGame } from 'gstech-core/modules/types/rewards';

const pg = require('gstech-core/modules/pg');

const addExpiredCheck = (qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> =>
  qb.andWhere((qb) => qb.where({ expires: null }).orWhere('expires', '>', pg.raw('now()')));

const ledgerWithRewardAndGameQuery = (
  knex: Knex | Knex$QueryBuilder<any>,
  selectArray: Array<string | Knex$Raw<any> | Knex$QueryBuilder<any>> = [],
): Knex$QueryBuilder<LedgerWithRewardAndGame[]> =>
  knex
    .from('ledgers')
    .select(
      'ledgers.id',
      'ledgers.externalId',
      'ledgers.creditDate',
      'ledgers.useDate',
      'ledgers.expires',
      'ledgers.groupId',
      pg.raw(`case
        when rewards.id is null then null
        else row_to_json(rewards) end as reward`),
      pg.raw(`case
        when rewards."gameId" is null then null
        else row_to_json(t1) end as game`),
      ...selectArray,
    )
    .leftJoin('rewards', 'rewards.id', 'ledgers.rewardId')
    .leftJoin(
      pg
        .from('games')
        .select('games.*', 'thumbnails.key as thumbnail')
        .leftJoin('thumbnails', 'thumbnails.id', 'games.thumbnailId')
        .as('t1'),
      't1.id',
      'rewards.gameId',
    );

module.exports = {
  addExpiredCheck,
  ledgerWithRewardAndGameQuery,
};
