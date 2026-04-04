/* @flow */
import type {
  CasinoCurrency,
  Reward,
  RewardDraft,
  RewardUpdate,
  RewardWithGame,
} from 'gstech-core/modules/types/rewards';

import type { RewardWithPermalink, ShopItemReward } from '../../../types/repository';

const { upsert2 } = require('gstech-core/modules/knex');
const logger = require('gstech-core/modules/logger');

const { gameTagMapper, weightedRandom } = require('../../utils');
const { addGroupDefinitionCheck } = require('../reward-definitions/utils');
const wheelSpinWeights = require('./wheelSpinWeights.json');

const createReward = async (
  knex: Knex,
  { order, ...rewardDraft }: RewardDraft,
): Promise<Reward> => {
  try {
    const [reward] = await knex('rewards')
      .insert({
        ...rewardDraft,
        order:
          order ||
          knex.select(
            knex.raw(
              'coalesce(?, 1)',
              knex('rewards')
                .select(knex.raw('"order" + 1'))
                .where({ creditType: rewardDraft.creditType })
                .orderBy('order', 'desc')
                .first(),
            ),
          ),
      })
      .returning('*');
    return reward;
  } catch (e) {
    if (e.message.includes('rewards_externalId_rewardDefinitionId_idx')) {
      return Promise.reject({ message: `Reward ${rewardDraft.externalId} already exists`, httpCode: 409 });
    }
    logger.error('createReward error', e);
    return Promise.reject({ message: 'Not able to create a reward', httpCode: 409 });
  }
};

const deleteReward = async (knex: Knex, rewardId: Id): Promise<void> =>
  knex('rewards').update({ removedAt: new Date() }).where({ id: rewardId, removedAt: null });

const duplicateReward = async (knex: Knex, rewardId: Id): Promise<Reward> => {
  // eslint-disable-next-line no-use-before-define
  const reward = await getReward(knex, rewardId);

  if (!reward) {
    return Promise.reject({ httpCode: 404, message: `Reward ${rewardId} not found` });
  }

  const { id, externalId, order, ...rewardDraft } = reward;  
  return createReward(knex, { ...rewardDraft, externalId: `${externalId}-new` });
};

const getRewards = async (
  knex: Knex,
  brandId: BrandId,
  {
    rewardType,
    group,
    getRemoved,
    externalId,
    excludeDisabled = true,
  }: {
    externalId?: string,
    rewardType?: string,
    group?: string,
    getRemoved?: boolean,
    excludeDisabled?: boolean,
  },
): Promise<RewardWithGame[]> => {
  const rewards = await knex('rewards')
    .select(
      knex.raw(`json_build_object(
        'id', rewards.id,
        'rewardDefinitionId', rewards."rewardDefinitionId",
        'creditType', rewards."creditType",
        'bonusCode', rewards."bonusCode",
        'description', rewards."description",
        'externalId', rewards."externalId",
        'metadata', rewards."metadata",
        'validity', rewards."validity",
        'price', rewards."price",
        'cost', rewards."cost",
        'spins', rewards."spins",
        'spinValue', rewards."spinValue",
        'spinType', rewards."spinType",
        'order', rewards."order",
        'gameId', rewards."gameId",
        'currency', rewards."currency",
        'removedAt', rewards."removedAt",
        'active', rewards."active",
        'rewardType', reward_definitions."rewardType"
      ) as reward`),
      knex.raw(`case
      when rewards."gameId" is null then null
      else row_to_json(t1) end as game`),
    )
    .leftJoin('reward_definitions', 'rewards.rewardDefinitionId', 'reward_definitions.id')
    .leftJoin(
      knex('games')
        .select('games.*', 'thumbnails.key as thumbnail')
        .leftJoin('thumbnails', 'thumbnails.id', 'games.thumbnailId')
        .as('t1'),
      't1.id',
      'rewards.gameId',
    )
    .where({
      'reward_definitions.brandId': brandId,
    })
    .modify((qb) => (getRemoved ? qb : qb.where({ 'rewards.removedAt': null })))
    .modify((qb) => (rewardType ? qb.where({ rewardType }) : qb))
    .modify((qb) => (externalId ? qb.where({ externalId }) : qb))
    .modify((qb) => addGroupDefinitionCheck(qb, group, brandId))
    .modify((qb) =>
      excludeDisabled
        ? qb
            .where({ 'rewards.active': true })
            .andWhere((qb) =>
              qb.where({ 't1.active': true }).orWhereNot({ 'rewards.creditType': 'freeSpins' }),
            )
        : qb,
    )
    .orderBy('reward_definitions.order')
    .orderBy('rewards.order');

  // Type parser doesn't work with row_to_json
  return rewards.map(gameTagMapper);
};

const getLedgerReward = async (knex: Knex, ledgerId: Id): Promise<RewardWithPermalink> =>
  knex('rewards')
    .select('rewards.*', 'games.permalink', 'reward_definitions.brandId')
    .innerJoin('reward_definitions', 'reward_definitions.id', 'rewards.rewardDefinitionId')
    .leftJoin('ledgers', 'ledgers.rewardId', 'rewards.id')
    .leftJoin('games', 'games.id', 'rewards.gameId')
    .where({ 'ledgers.id': ledgerId, 'rewards.removedAt': null, 'games.removedAt': null })
    .first();

const getLootBoxRewardCandidates = async (
  knex: Knex,
  value: number,
  brandId: BrandId,
  isMoney: boolean = false,
): Promise<{
  ...Reward,
  cost: number,
}[]> => (
  knex
    .with('rewardValue', qb => (
      qb
        .select('cost')
        .from('rewards')
        .leftJoin('reward_definitions', 'rewards.rewardDefinitionId', 'reward_definitions.id')
        .where({ rewardType: 'lootBoxContent', brandId, removedAt: null, active: true })
        .where('cost', '<=', value)
        .modify(qb2 => (isMoney ? qb2.where({ creditType: 'real' }) : qb2.where({ creditType: 'freeSpins' })))
        .orderBy('cost', 'desc')
        .first()
    ))
    .select('rewards.*')
    .from('rewards')
    .leftJoin('reward_definitions', 'rewards.rewardDefinitionId', 'reward_definitions.id')
    .where({ rewardType: 'lootBoxContent', 'reward_definitions.brandId': brandId, removedAt: null })
    .where('cost', '=', knex.raw('(select cost from "rewardValue")'))
    .modify(qb2 => (isMoney ? qb2.where({ creditType: 'real' }) : qb2.where({ creditType: 'freeSpins' })))
);

const getProgressRewards = async (knex: Knex, progressId: Id): Promise<Array<{ id: Id, rewardDefinitionId: Id }>> => (
  knex(knex.raw('progresses_rewards pr'))
    .select('rewards.id', 'rewardDefinitionId', 'validity')
    .leftJoin('rewards', 'rewards.id', 'pr.rewardId')
    .where({ progressId })
);

const getReward = async (knex: Knex, rewardId: Id, brandId?: BrandId): Promise<?Reward> =>
  knex('rewards')
    .innerJoin('reward_definitions', 'rewards.rewardDefinitionId', 'reward_definitions.id').
    select('rewards.*')
    .where({ 'rewards.id': rewardId })
    .modify((qb) => brandId ? qb.where({ brandId }): qb)
    .first();

const getRewardByExternalId = async (
  knex: Knex,
  {
    rewardType,
    group,
    ...query
  }: { externalId: string, rewardType?: string, group?: string, brandId: BrandId },
): Promise<Reward> => {
  if (!rewardType && !group) {
    return Promise.reject({ httpCode: 400, message: 'Incorrect query parameter' });
  }

  const rewards = await knex('rewards')
    .leftJoin('reward_definitions', 'reward_definitions.id', 'rewards.rewardDefinitionId')
    .select('rewards.*')
    .where({ ...query, removedAt: null, active: true })
    .modify(addGroupDefinitionCheck, group, query.brandId)
    .modify((qb) => (rewardType ? qb.where({ rewardType }) : qb));
  if (rewards.length !== 1) {
    return Promise.reject({ httpCode: 409, message: `Reward ${query.externalId} not found` });
  }
  return rewards[0];
};

const getRewardWithGame = async (knex: Knex, rewardId: Id): Promise<RewardWithGame> => {
  const reward = await knex('rewards')
    .select(
      knex.raw('row_to_json(rewards) as reward'),
      knex.raw(`case
      when games.id is null then null
      else row_to_json(games) end as game`),
    )
    .leftJoin('games', 'games.id', 'rewards.gameId')
    .where({ 'rewards.id': rewardId })
    .first();

  if (!reward) {
    return Promise.reject({ httpCode: 404, message: `Reward ${rewardId} not found` });
  }

  return gameTagMapper(reward);
};

const getShopItemReward = async (knex: Knex, rewardId: Id): Promise<ShopItemReward> =>
  knex('rewards')
    .select('price', 'currency', 'rewardDefinitionId', 'validity')
    .leftJoin('reward_definitions', 'rewards.rewardDefinitionId', 'reward_definitions.id')
    .where({ 'rewards.id': rewardId })
    .first();

const getShopItemsPlayerCanAfford = async (
  knex: Knex,
  brandId: string,
  playerId: Id,
  currency: CasinoCurrency,
): Promise<Reward[]> =>
  knex
    .with('availableCoins', (qb) =>
      qb
        .count('playerId as sum')
        .from('ledgers')
        .leftJoin('rewards', 'ledgers.rewardId', 'rewards.id')
        .where({ useDate: null, creditType: currency, playerId }),
    )
    .select(
      'rewards.id',
      'creditType',
      'bonusCode',
      'description',
      'rewards.externalId',
      'metadata',
    )
    .from('rewards')
    .leftJoin('reward_definitions as rd', 'rewards.rewardDefinitionId', 'rd.id')
    .where({ brandId, currency, removedAt: null, active: true })
    .whereRaw('price', '<=', knex.raw('(select sum from "availableCoins")'));

const getWheelSpinReward = async (knex: Knex): Promise<?Reward> => {
  const possibleReward = weightedRandom(wheelSpinWeights);

  let reward;
  if (possibleReward.id !== 'nowin') {
    reward = await knex('rewards')
      .leftJoin('reward_definitions', 'reward_definitions.id', 'rewards.rewardDefinitionId')
      .select('rewards.*')
      .where({
        'reward_definitions.rewardType': 'wheelSpinContent',
        externalId: possibleReward.id,
        removedAt: null,
        active: true,
      })
      .first();
    if (!reward) {
      throw new Error(`Reward ${possibleReward.id} could not be found`);
    }
    return reward;
  }
  return null;
};

const updateReward = async (
  knex: Knex,
  rewardId: Id,
  rewardUpdate: RewardUpdate,
): Promise<Reward> => {
  const [reward] = await knex('rewards')
    .update(rewardUpdate, ['*'])
    .where({ id: rewardId, removedAt: null });

  return reward;
};

const upsertReward = async (knex: Knex, rewardDraft: RewardDraft): Promise<Reward> => {
  const { metadata, ...rest } = rewardDraft;
  return upsert2(
    knex,
    'rewards',
    { ...rest, metadata: JSON.stringify(metadata) },
    ['rewardDefinitionId', 'externalId'],
    ['removedAt'],
    'where "removedAt" is null',
  );
};

module.exports = {
  createReward,
  deleteReward,
  duplicateReward,
  getReward,
  getRewardByExternalId,
  getRewards,
  getLedgerReward,
  getLootBoxRewardCandidates,
  getProgressRewards,
  getRewardWithGame,
  getShopItemReward,
  getShopItemsPlayerCanAfford,
  getWheelSpinReward,
  updateReward,
  upsertReward,
};
