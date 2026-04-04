// @flow
import type { DepositDraft, Deposit, RewardRulesTrigger } from '../types/common';
import type { RewardToCredit } from '../types/events';

const { upsert2 } = require('gstech-core/modules/knex');
const pg = require('gstech-core/modules/pg');

const createDeposit = async (knex: Knex, depositDraft: DepositDraft): Promise<Id> =>
  knex('deposits')
    .insert(depositDraft)
    .returning('id')
    .then(([row]) => row?.id);


const getDepositByPaymentId = (knex: Knex, paymentId: Id): Knex$QueryBuilder<Deposit> =>
  knex('deposits').where({ paymentId }).first();

const getRewardsToCredit = (
  knex: Knex,
  externalPlayerId: Id,
  trigger: RewardRulesTrigger,
  campaignIds: Id[] | null,
  amount?: Money,
  timestamp: Date,
): Knex$QueryBuilder<RewardToCredit[]> =>
  knex('reward_rules')
    .select(
      'reward_rules.id as rewardRulesId',
      'reward_rules.campaignId',
      'reward_rules.rewardId',
      'reward_rules.minDeposit',
      'reward_rules.maxDeposit',
      'reward_rules.titles',
      'reward_rules.wager',
      'reward_rules.quantity',
      'reward_rules.useOnCredit',
      'campaigns_players.playerId',
      'campaigns.creditMultiple',
      'campaigns.name as campaignName',
    )
    .innerJoin('campaigns', 'campaigns.id', 'reward_rules.campaignId')
    .innerJoin('campaigns_players', 'campaigns_players.campaignId', 'campaigns.id')
    .innerJoin('players', 'players.id', 'campaigns_players.playerId')
    .leftJoin(
      knex('campaigns')
        .select(
          'campaigns.id as campaignId',
          'rewardRulesId',
          'playerId',
          knex.raw('count(credited_rewards.*) as "creditedRewardsCount"'),
        )
        .leftJoin('credited_rewards', 'credited_rewards.campaignId', 'campaigns.id')
        .groupBy('playerId')
        .groupBy('campaigns.id')
        .groupBy('rewardRulesId')
        .as('t1'),
      {
        'reward_rules.campaignId': 't1.campaignId',
        'players.id': 't1.playerId',
        'reward_rules.id': 't1.rewardRulesId',
      },
    )
    .where({
      trigger,
      'campaigns.status': 'running',
      'players.externalId': externalPlayerId,
      'campaigns_players.complete': false,
      'reward_rules.removedAt': null,
    })
    .andWhere((qb) =>
      qb
        .where({ creditMultiple: true, trigger: 'deposit' })
        .orWhere({ 't1.creditedRewardsCount': 0 })
        .orWhere({ 't1.campaignId': null }),
    )
    .modify((qb) =>
      trigger === 'deposit'
        ? qb.whereRaw(
            '(reward_rules."campaignId" = any(:campaignIds) or (reward_rules.wager = 0 and campaigns_players."addedAt" <= :timestamp and (campaigns_players."removedAt" is null or campaigns_players."removedAt" > :timestamp)))',
            {
              campaignIds,
              timestamp,
            },
          )
        : qb,
    )
    .modify((qb) =>
      amount
        ? qb
            .where(pg.raw('100 * "minDeposit"'), '<=', amount)
            .andWhere((qb) =>
              qb.where({ maxDeposit: null }).orWhere(pg.raw('100 * "maxDeposit"'), '>', amount),
            )
        : qb,
    )
    .orderBy('reward_rules.campaignId')
    .orderBy('reward_rules.id');

const upsertDeposit = async (knex: Knex, depositDraft: DepositDraft): Promise<Deposit> =>
  upsert2(knex, 'deposits', depositDraft, ['paymentId']);

module.exports = {
  createDeposit,
  getDepositByPaymentId,
  getRewardsToCredit,
  upsertDeposit,
};
