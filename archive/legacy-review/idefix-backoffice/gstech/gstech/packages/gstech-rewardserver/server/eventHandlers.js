/* @flow */
import type { RewardDefinition, Progress } from 'gstech-core/modules/types/rewards';
import type { WageringEvent } from 'gstech-core/modules/types/bus';

const logger = require('gstech-core/modules/logger');
const postgres = require('gstech-core/modules/pg');

const { createProgressForRewardDefinition } = require('./modules/progresses/Progresses');
const { createLedgers } = require('./modules/ledgers/Ledgers');
const { getProgressRewards } = require('./modules/rewards/Rewards');

const { updateProgress } = require('./events/RewardProgressUpdateEvent');
const { creditReward } = require('./events/CreditRewardEvent');

const creditRewards = async (
  knex: Knex,
  rewards: Array<{ id: Id, rewardDefinitionId: Id }>,
  playerId: Id,
  brandId: BrandId,
  rewardDefinition: RewardDefinition,
  progressId: Id,
): Promise<any> => {
  // TODO: For now we assume that all rewards are the same.
  // In the future we should either change implementation to reflect that or change the code below
  const reward = rewards[0];
  if (!reward) {
    logger.warn('creditRewards, not credited', rewards);
    return Promise.all<[]>([]);
  }
  const ledgers = await createLedgers(
    knex,
    {
      rewardId: reward.id,
      rewardDefinitionId: reward.rewardDefinitionId,
      playerId,
      creditDate: new Date(),
      source: 'wagering',
    },
    rewards.length,
  );

  return Promise.all(
    ledgers.map(async ({ id }) => {
      await knex('progresses_ledgers').insert({ progressId, ledgerId: id, playerId });
      await creditReward(playerId, brandId, rewardDefinition);
    }),
  );
};

/**
 * Update progress and game progress betAmount and mark as not active
 */
const resolveProgresses = async (
  knex: Knex,
  progressId: Id,
  gameProgressId?: Id,
  overflow: Money,
) => {
  await knex('progresses')
    .update({ completedAt: new Date() })
    .decrement('contribution', overflow)
    .where({ id: progressId });

  if (gameProgressId) {
    await knex('game_progresses').decrement('betAmount', overflow).where({ id: gameProgressId });
  }
};

/**
 * Check if the progress value is over the target value
 * If so close previous progress, create new one and credit player a reward (create ledger)
 */
const checkForOverflow = async (
  pg: Knex,
  progress: Progress,
  bet: WageringEvent,
  gameId: ?Id,
  rewardDefinition: RewardDefinition,
  gameProgressId?: Id,
  promotionName?: string,
): Promise<?Progress> => {
  const overflow = progress.contribution - progress.target;
  if (overflow >= 0) {
    const rewards = await getProgressRewards(pg, progress.id);

    await creditRewards(pg, rewards, bet.playerId, bet.brandId, rewardDefinition, progress.id);

    await resolveProgresses(pg, progress.id, gameProgressId, overflow);

    // Create new progress
    // eslint-disable-next-line no-use-before-define
    return createOrUpdateProgress(
      pg,
      bet,
      gameId,
      {
        contribution: overflow,
        betAmount: overflow,
        winAmount: 0,
        total: progress.cumulativeContribution,
      },
      rewardDefinition,
      promotionName,
      true,
    );
  }

  return progress;
};

/**
 * Create or update pairs of progress and game_progress for bet
 */
const createOrUpdateProgress = async (
  pg: Knex,
  bet: WageringEvent,
  gameId: ?Id,
  money: { contribution: Money, betAmount: Money, winAmount: Money, total?: Money },
  rewardDefinition: RewardDefinition,
  promotionName?: string,
  recurringProgress?: boolean,
): Promise<?Progress> => {
  const contribution = Math.round(money.contribution);
  const betAmount = Math.round(money.betAmount);
  const winAmount = Math.round(money.winAmount);
  const betCount = recurringProgress || bet.bet === 0 ? 0 : 1;
  const { total } = money;
  try {
    // Lock on rewardDefinition as there is no player instance to lock on
    await pg('reward_definitions').where({ id: rewardDefinition.id, internal: false }).forUpdate();

    const currentProgress = await pg('progresses')
      .first('*')
      .where({ playerId: bet.playerId, completedAt: null, rewardDefinitionId: rewardDefinition.id })
      .forUpdate();

    let progress: Progress;

    if (currentProgress) {
      const update = {
        cumulativeContribution: total || undefined,
        updatedAt: betAmount ? new Date() : undefined,
      };
      Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
      [progress] = await pg('progresses')
        .increment('betCount', betCount)
        .increment('contribution', contribution)
        .modify((qb) => (Object.keys(update).length ? qb.update(update) : qb))
        .where({ id: currentProgress.id })
        // Check if the event has been already processed
        .modify((qb) =>
          total ? qb.where('cumulativeContribution', contribution === 0 ? '<=' : '<', total) : qb,
        )
        .returning(['contribution', 'target', 'id', 'cumulativeContribution']);

      // Do not do anything if event has already been processed
      if (!progress) {
        return null;
      }
    } else {
      progress = await createProgressForRewardDefinition(
        pg,
        rewardDefinition,
        bet.playerId,
        promotionName,
        contribution,
        betCount,
        total || 0,
      );
    }

    let gameProgressId;
    if (gameId) {
      const gpInsert = pg('game_progresses').insert({
        progressId: progress.id,
        gameId,
        betCount,
        betAmount,
        winAmount,
        playerId: bet.playerId,
      });

      const { rows: gameProgressResult } = await pg.raw(
        `? ON CONFLICT ("progressId", "gameId") DO UPDATE SET
      "betCount" = game_progresses."betCount" + 1,
      "betAmount" = game_progresses."betAmount" + ?,
      "winAmount" = game_progresses."winAmount" + ?
      RETURNING id`,
        [gpInsert, betAmount, winAmount],
      );
      gameProgressId = gameProgressResult[0].id;
    }

    return await checkForOverflow(
      pg,
      progress,
      bet,
      gameId,
      rewardDefinition,
      gameProgressId,
      promotionName,
    );
  } catch (e) {
    if (
      e.constraint === 'progresses_rewardDefinitionId_perRewardDefinitionCount_play_key' ||
      e.constraint === 'progresses_2col_idx'
    ) {
      // If we encounter duplication on key, try again
      // Need to create new transaction
      return postgres.transaction((tx) =>
        createOrUpdateProgress(
          tx,
          bet,
          gameId,
          { contribution, betAmount, winAmount, total },
          rewardDefinition,
          promotionName,
          recurringProgress,
        ),
      );
    }
    logger.error('createOrUpdateProgress failed', e);
    throw e;
  }
};

const handleBetEvent = async (pg: Knex, bet: WageringEvent) => {
  await pg.transaction(async (tx) => {
    const promotions = bet.promotions || [];
    const { permalink, brandId, playerId, win: winAmount, bet: betAmount } = bet;

    const game = await tx('games').where({ permalink, brandId }).first();

    // Get active reward definitions
    const rewardDefinitions = await tx('reward_definitions')
      .select(['id', 'promotion', 'rewardType', 'brandId'])
      .where({ brandId, internal: false, followUpdates: true });

    for (const rewardDefinition of rewardDefinitions) {
      let lastProgress;
      if (rewardDefinition.promotion) {
        const matchingPromotion = promotions.find((p) => p.name === rewardDefinition.promotion);
        if (matchingPromotion) {
          lastProgress = await createOrUpdateProgress(
            tx,
            bet,
            game && game.id,
            {
              contribution: matchingPromotion.contribution,
              betAmount,
              winAmount,
              total: matchingPromotion.value,
            },
            rewardDefinition,
            matchingPromotion.name,
          );
        } else {
          // Only initialize progress for rewardDefinition
          lastProgress = await createOrUpdateProgress(
            tx,
            bet,
            game && game.id,
            {
              contribution: 0,
              betAmount: 0,
              winAmount: 0,
            },
            rewardDefinition,
            rewardDefinition.promotion,
            true,
          );
        }
      } else {
        lastProgress = await createOrUpdateProgress(
          tx,
          bet,
          game && game.id,
          { contribution: betAmount, betAmount, winAmount },
          rewardDefinition,
        );
      }

      if (lastProgress) {
        await updateProgress(playerId, brandId, rewardDefinition, lastProgress);
      }
    }
  });
};

module.exports = { handleBetEvent };
