/* @flow */
import type {
  Progress,
  RewardDefinition,
  ProgressWithDetails,
} from 'gstech-core/modules/types/rewards';
import type { FavouriteGames } from '../../../types/repository';

const logger = require('gstech-core/modules/logger');

const getNextRewardAndTarget = require('../../next-reward');
const { gameTagMapper } = require('../../utils');

const getPlayerPerRewardDefinitionCount = async (
  knex: Knex,
  rewardDefinitionId: Id,
  playerId: Id,
): Promise<number> => {
  const progress = await knex('progresses')
    .first('perRewardDefinitionCount as count')
    .where({ rewardDefinitionId, playerId })
    .orderBy('progresses.perRewardDefinitionCount', 'desc');

  return progress ? progress.count : 0;
};

const createProgressForRewardDefinition = async (
  knex: Knex,
  rewardDefinition: RewardDefinition,
  playerId: Id,
  promotionName?: string,
  contribution: number = 0,
  betCount: number = 0,
  cumulativeContribution: number = 0,
): Promise<Progress> => {

  const { rewards, target, progressModifier } = await getNextRewardAndTarget(
    knex,
    rewardDefinition,
    promotionName,
    playerId,
  );
  if (!rewards.length) {
    throw Error(`"${rewardDefinition.rewardType}" not found for brand ${rewardDefinition.brandId}`);
  }

  const perRewardDefinitionCount = await getPlayerPerRewardDefinitionCount(
    knex,
    rewardDefinition.id,
    playerId,
  );

  const progressInsert = knex('progresses').insert({
    rewardDefinitionId: rewardDefinition.id,
    playerId,
    perRewardDefinitionCount: perRewardDefinitionCount + 1,
    betCount,
    contribution:
      progressModifier && progressModifier.contribution
        ? contribution + progressModifier.contribution
        : contribution,
    cumulativeContribution,
    target,
    multiplier: (progressModifier && progressModifier.multiplier) || 1,
  });

  const { rows: progresses } = await knex.raw(
    '? ON CONFLICT ("rewardDefinitionId", "perRewardDefinitionCount", "playerId") DO UPDATE set "updatedAt" = now() returning *',
    [progressInsert],
  );

  // Connect rewards to progress on creation
  await Promise.all(
    rewards.map((reward) =>
      knex('progresses_rewards').insert({
        progressId: progresses[0].id,
        rewardId: reward.id,
        playerId,
      }),
    ),
  );
  return progresses[0];
};

const getPlayerActiveProgresses = async (
  knex: Knex,
  playerId: Id,
  brandId: BrandId,
): Promise<ProgressWithDetails[]> => {
  const progresses = await knex
    .select(
      't1.multiplier',
      't1.rewardDefinitionId',
      't1.rewardType',
      't1.progress',
      't1.startedAt',
      't1.updatedAt',
      't1.betCount',
      't1.contribution',
      't1.target',
      knex
        .select(
          knex.raw(
            `coalesce(
              array_agg(json_build_object(
                'reward', t2.reward,
                'game', t2.game,
                'quantity', t2.quantity
              )),
              '{}'
            )`,
          ),
        )
        .from(
          knex
            .select(
              knex.raw('row_to_json(rewards) as reward'),
              knex.raw(`case
                when games.id is null then null
                else row_to_json(games) end as game`),
              knex.count('progresses_rewards.id').as('quantity'),
            )
            .from('progresses_rewards')
            .leftJoin('rewards', 'rewards.id', 'progresses_rewards.rewardId')
            .leftJoin('games', 'games.id', 'rewards.gameId')
            .where({ 'progresses_rewards.progressId': knex.ref('t1.progressId') })
            .groupBy('rewards.id')
            .groupBy('games.id')
            .as('t2'),
        )
        .as('rewards'),
    )
    .from(
      knex('progresses')
        .select(
          'progresses.id as progressId',
          'progresses.startedAt',
          'progresses.updatedAt',
          'progresses.betCount',
          'progresses.multiplier',
          'progresses.rewardDefinitionId',
          'reward_definitions.rewardType',
          'progresses.contribution',
          'progresses.target',
          knex.raw(
            'progresses."contribution"::float / progresses."target"::float * 100 as progress',
          ),
        )
        .from('progresses')
        .innerJoin('reward_definitions', 'reward_definitions.id', 'progresses.rewardDefinitionId')
        .where({ playerId, completedAt: null, brandId })
        .groupBy('progresses.id')
        .groupBy('reward_definitions.id')
        .as('t1'),
    );

  return progresses.map(({ rewards, ...rest }) => ({
    ...rest,
    rewards: rewards.map(gameTagMapper),
  }));
};

const getPlayerFavouriteGames = async (knex: Knex, playerId: Id): Promise<FavouriteGames> =>
  knex('game_progresses as gp')
    .select(
      'gameId',
      knex.raw('(cast(sum(gp."betAmount") as decimal) / sum(gp."betCount")) as "avgBet"'),
      knex.raw('sum(gp."betCount") as "betCount"'),
    )
    .where({ playerId })
    .groupBy('gameId')
    .orderBy('betCount', 'desc')
    .orderBy('avgBet', 'desc');

const initializeAndReturnPlayerProgresses = async (
  knex: Knex,
  brandId: BrandId,
  playerId: Id,
): Promise<ProgressWithDetails[]> => {
  try {
    const progresses = await getPlayerActiveProgresses(knex, playerId, brandId);
    if (progresses.length === 0) {
      const rewardDefinitions = await knex('reward_definitions').where({
        brandId,
        followUpdates: true,
        internal: false,
      }).forUpdate(); // Locking for update to prevent deadlocks. reward_definitions are also locked in eventHandlers

      let modified = false;
      await Promise.all(
        rewardDefinitions.map(async (rd) => {
          if (!progresses.some((p) => p.rewardDefinitionId === rd.id)) {
            await createProgressForRewardDefinition(knex, rd, playerId, rd.promotion);
            modified = true;
          }
        }),
      );
      if (modified) {
        return getPlayerActiveProgresses(knex, playerId, brandId);
      }
    }
    return progresses;
  } catch (e) {
    logger.error('initializeProgresses error', e);
    return [];
  }
};

module.exports = {
  createProgressForRewardDefinition,
  getPlayerFavouriteGames,
  getPlayerPerRewardDefinitionCount,
  getPlayerActiveProgresses,
  initializeAndReturnPlayerProgresses,
};
