/* @flow */
import type {
  CasinoCurrency,
  Ledger,
  LedgerDraft,
  LedgerEventDraft,
  LedgerWithRewardAndGame,
  Reward,
  RewardWithLedgerId,
  PlayerBalance,
  LedgerSource,
} from 'gstech-core/modules/types/rewards';

import type { LootBoxLedger } from '../../../types/repository';

const { DateTime } = require('luxon');
const moment = require('moment-timezone');

const logger = require('gstech-core/modules/logger');
const client = require('gstech-core/modules/clients/backend-bonus-api');

const Rewards = require('../rewards/Rewards');
const Games = require('../games/Games');
const {
  createProgressForRewardDefinition,
  getPlayerFavouriteGames,
} = require('../progresses/Progresses');
const { getBoxRewards, KKLootBoxWeights } = require('../lootboxes/LootBoxes');
const { weightedRandom, gameTagMapper } = require('../../utils');
const { addExpiredCheck, ledgerWithRewardAndGameQuery } = require('./utils');
const { addGroupDefinitionCheck } = require('../reward-definitions/utils');

const createLedger = async (knex: Knex, ledgerDraft: LedgerDraft): Promise<Ledger> => {
  const [ledger] = await knex('ledgers')
    .insert({ ...ledgerDraft, expires: ledgerDraft.expires || moment().add(90, 'days') })
    .returning('*');

  return ledger;
};

const setLedgerExpiryAndExternalId = async (
  knex: Knex,
  ledgerId: Id,
  externalId: string,
  expires: Date,
): Promise<Ledger> =>
  knex('ledgers').where({ id: ledgerId }).update({ externalId, expires }).returning('*');

const createLedgers = async (
  knex: Knex,
  { externalId, ...ledgerDraft }: LedgerDraft,
  quantity: number,
): Promise<Ledger[]> => {
  const insert = knex('ledgers')
    .with('seq', (qb) => qb.select(knex.raw("nextval('ledgers_group_id_seq') as seq")))
    .insert(
      [...Array(quantity)].map((_, i) => ({
        ...ledgerDraft,
        externalId: i === 0 ? externalId : externalId && `${externalId}-${i}`,
        groupId: knex.raw('(select seq from seq)'),
      })),
    );

  const { rows } = await knex.raw(
    `? on conflict ("rewardDefinitionId", "playerId", "externalId") where ("externalId" is not null)
    do update set "externalId" = excluded."externalId"
    returning *`,
    [insert],
  );
  return rows;
};

const createLedgersEvents = async (
  knex: Knex,
  ledgerIds: Id[],
  { userId, parameters = {}, ...rest }: LedgerEventDraft,
): Promise<Id[]> =>
  Promise.all(
    ledgerIds.map(async (id) =>
      knex('ledgers_events')
        .insert({
          ledgerId: id,
          parameters: { userId, ...parameters },
          ...rest,
        })
        .returning('id')
        .then(([row]) => row?.id),
    ),
  );

const creditReward = async (
  knex: Knex,
  reward: Reward,
  playerId: Id,
  source: LedgerSource,
  {
    externalLedgerId,
    count,
    useOnCredit,
  }: { externalLedgerId?: string, count: number, useOnCredit?: boolean, ... },
): Promise<Ledger[]> => {
  const isProgressReward = reward.creditType === 'progress';
  if (isProgressReward) {
    // eslint-disable-next-line no-use-before-define
    await creditProgressReward(knex, playerId, reward);
  }

  const ledgerDraft = {
    rewardId: reward.id,
    rewardDefinitionId: reward.rewardDefinitionId,
    playerId,
    source,
    creditDate: new Date(),
    externalId: externalLedgerId,
    useDate: isProgressReward ? new Date() : null,
  };
  try {
    const ledgers = await createLedgers(knex, ledgerDraft, count);

    if (useOnCredit) {
      for (const ledger of ledgers) {
        // eslint-disable-next-line no-use-before-define
        await useLedger(knex, playerId, ledger.id);
      }
    }
    return ledgers;
  } catch (e) {
    logger.error(e);
    return Promise.reject({
      httpCode: 400,
      message: `Could not credit reward ${reward.id} for player ${playerId}`,
    });
  }
};

const creditProgressReward = async (knex: Knex, playerId: Id, reward: Reward): Promise<Id> => {
  const progress = await knex('progresses')
    .where({ playerId, rewardDefinitionId: reward.rewardDefinitionId })
    .orderBy('perRewardDefinitionCount', 'desc')
    .first();

  const percent = ((reward.metadata && reward.metadata.value) || 0) / 100;
  if (progress) {
    if (progress.contribution / progress.target < percent) {
      await knex('progresses')
        .update({ contribution: Math.round(percent * progress.target) })
        .where({ id: progress.id });
    }
    return progress.id;
  }

  const rewardDefinition = await knex('reward_definitions')
    .where({ id: reward.rewardDefinitionId })
    .first();
  const newProgress = await createProgressForRewardDefinition(knex, rewardDefinition, playerId);
  await knex('progresses')
    .update({ contribution: Math.round(percent * newProgress.target) })
    .where({ id: newProgress.id });
  return newProgress.id;
};

const importLedgers = async (
  knex: Knex,
  playerId: Id,
  brandId: BrandId,
  ledgers: { id: string, rewardid: string, used: boolean, timestamp?: Date, usedTime: Date }[],
): Promise<mixed> =>
  Promise.all(
    ledgers.map(async (l) => {
      const reward = await knex('rewards')
        .leftJoin('reward_definitions', 'reward_definitions.id', 'rewards.rewardDefinitionId')
        .first('rewards.*')
        .where({ brandId, externalId: l.rewardid });
      if (!reward) {
        logger.warn('importLedgers', `Reward ${l.id} or ${l.rewardid} not found`);
        return null;
      }
      return knex.raw(
        `insert into ledgers
                       ("rewardId", "rewardDefinitionId", "creditDate", "externalId", "useDate", "playerId", "source")
                       values (:rewardId, :rewardDefinitionId, :creditDate, :externalId, :useDate, :playerId, 'manual')
                       on conflict ("rewardDefinitionId", "playerId", "externalId")
                       where "externalId" is not null do nothing`,
        {
          rewardId: reward.id,
          rewardDefinitionId: reward.rewardDefinitionId,
          creditDate: l.timestamp || new Date(),
          externalId: l.id,
          useDate: l.used ? l.usedTime : null,
          playerId,
        },
      );
    }),
  );

const markLedgersUsed = async (
  knex: Knex,
  ledgerIds: Id[],
  playerId?: Id,
): Promise<LedgerWithRewardAndGame[]> => {
  const ledgers = await knex('ledgers')
    .update({ useDate: DateTime.utc() })
    .where({ useDate: null })
    .whereIn('id', ledgerIds)
    .modify(addExpiredCheck)
    .modify((qb) => (playerId ? qb.where({ playerId }) : qb))
    .returning('*');
  if (ledgers.length !== ledgerIds.length) {
    throw new Error(`markLedgersUsed could not update ledgers ${ledgerIds.join(', ')} properly`);
  }

  return ledgerWithRewardAndGameQuery(knex).whereIn('ledgers.id', ledgerIds);
};

const markLedgerGroupUsed = async (
  knex: Knex,
  groupId: Id,
  playerId: Id,
): Promise<LedgerWithRewardAndGame[]> => {
  const ledgers = await knex('ledgers').where({ groupId, playerId });

  let ledgersForUpdate: any[] = [];
  const usedLedgers = ledgers.filter(({ useDate }) => useDate !== null);
  if (usedLedgers.length === ledgers.length) {
    return Promise.reject({
      httpCode: 409,
      message: `All ledgers from group ${groupId} already used`,
    });
  }

  if (usedLedgers.length) {
    // If group contains used ledgers try to find unused
    const randomLedgers = await knex('ledgers')
      .where({ playerId, rewardId: ledgers[0].rewardId, useDate: null })
      .whereNot({ groupId })
      .modify(addExpiredCheck)
      .orderBy('creditDate', 'asc')
      .limit(usedLedgers.length);

    if (randomLedgers.length < usedLedgers.length) {
      return Promise.reject({
        httpCode: 409,
        message: `Not enough ledgers to mark used for group ${groupId}`,
      });
    }

    ledgersForUpdate = [...ledgers.filter(({ useDate }) => useDate === null), ...randomLedgers];
  } else {
    ledgersForUpdate = ledgers;
  }

  await knex('ledgers')
    .whereIn(
      'id',
      ledgersForUpdate.map(({ id }) => id),
    )
    .update({ useDate: new Date() })
    .returning('*');
  return ledgerWithRewardAndGameQuery(knex).whereIn(
    'ledgers.id',
    ledgersForUpdate.map(({ id }) => id),
  );
};

const getLedger = async (
  knex: Knex,
  ledgerId: Id,
  { playerId, unused }: { playerId?: Id, unused?: boolean } = {},
): Promise<Ledger> =>
  knex('ledgers')
    .where({ id: ledgerId })
    .modify((qb) => (playerId ? qb.where({ playerId }) : qb))
    .modify((qb) => (unused ? qb.where({ useDate: null }) : qb))
    .first();

const getLedgersByRewardType = async (
  knex: Knex,
  brandId: BrandId,
  playerId: Id,
  rewardType: string,
  excludeUsed: boolean = true,
): Promise<Ledger[]> =>
  knex('ledgers')
    .innerJoin('reward_definitions', 'reward_definitions.id', 'ledgers.rewardDefinitionId')
    .select('ledgers.*')
    .where({ playerId, rewardType, brandId })
    .modify((qb) => (excludeUsed ? qb.where({ useDate: null }) : qb))
    .modify(addExpiredCheck)
    .orderBy('creditDate', 'asc');

const getLedgers = async (
  knex: Knex,
  playerId: Id,
  {
    brandId,
    group,
    rewardType,
    pageSize,
    pageIndex,
    rewardDefinitionId,
    externalId,
    excludeUsed = true,
    excludeExpired = true,
    includeEvents = false,
    excludeDisabled = true,
  }: {
    brandId?: BrandId,
    group?: string,
    rewardType?: string,
    pageSize?: number,
    pageIndex?: number,
    rewardDefinitionId?: Id,
    excludeUsed?: boolean,
    excludeExpired?: boolean,
    externalId?: string,
    includeEvents?: boolean,
    excludeDisabled?: boolean,
  } = {},
): Promise<LedgerWithRewardAndGame[]> => {
  let ledgers: any;
  const query = knex
    .with('q', (mqb) =>
      ledgerWithRewardAndGameQuery(mqb, [
        knex.raw(
          'cast(count(ledgers.id) over (partition by ledgers."groupId") as integer) as quantity',
        ),
        knex.raw(
          'row_number() over (partition by ledgers."groupId" order by ledgers."externalId") as rn',
        ),
        ...(includeEvents
          ? [
              knex.raw(
                `COALESCE(json_agg(ledgers_events) FILTER (WHERE "ledgers_events"."ledgerId" IS NOT NULL), '[]') as events`,
              ),
              knex
                .from('ledgers_events')
                .select(knex.raw("parameters -> 'externalRewardId'"))
                .where({ event: 'wheelSpin-result', ledgerId: knex.ref('ledgers.id') })
                .as('result'),
            ]
          : [knex.raw("ledgers_events.parameters -> 'externalRewardId' as result")]),
      ])
        .leftJoin('reward_definitions', 'reward_definitions.id', 'ledgers.rewardDefinitionId')
        .modify((qb) =>
          includeEvents
            ? qb.leftJoin('ledgers_events', 'ledgers_events.ledgerId', 'ledgers.id')
            : qb.leftJoin('ledgers_events', {
                'ledgers_events.ledgerId': 'ledgers.id',
                'ledgers_events.event': knex.raw('?', ['wheelSpin-result']),
              }),
        )
        .where({ playerId })
        .modify((qb) => (rewardType ? qb.where({ rewardType }) : qb))
        .modify((qb) =>
          rewardDefinitionId ? qb.where({ 'reward_definitions.id': rewardDefinitionId }) : qb,
        )
        .modify((qb) => (excludeUsed ? qb.where({ useDate: null }) : qb))
        .modify((qb) => (externalId ? qb.where({ 'ledgers.externalId': externalId }) : qb))
        .modify(addGroupDefinitionCheck, group, brandId)
        .modify((qb) => (excludeExpired ? addExpiredCheck(qb) : qb))
        .modify((qb) =>
          excludeDisabled
            ? qb.where({ 'rewards.active': true }).andWhere((qb) => {
                qb.where({ 't1.active': true }).orWhereNot({ 'rewards.creditType': 'freeSpin' });
              })
            : qb,
        )
        .groupBy('ledgers.id')
        .groupBy('rewards.id')
        .groupBy('ledgers_events.parameters')
        .groupBy('t1.*'),
    )
    .select([
      'id',
      'externalId',
      'creditDate',
      'useDate',
      'expires',
      'reward',
      'game',
      'groupId',
      'quantity',
      'result',
      ...(includeEvents ? ['events'] : []),
    ])
    .from('q')
    .where({ 'q.rn': 1 })
    .orderBy('creditDate', 'desc');

  if (pageSize) {
    const result: any = await query.paginate({ perPage: pageSize, currentPage: pageIndex || 1 });
    ledgers = result.data;
  } else {
    ledgers = await query;
  }

  return ledgers.map(gameTagMapper);
};

const useLedger = (db: Knex, playerId: Id, ledgerId: Id): Promise<LedgerWithRewardAndGame[]> =>
  db.transaction(async (tx) => {
    const ledger = await getLedger(tx, ledgerId, { playerId, unused: true });
    if (!ledger) {
      return Promise.reject({ httpCode: 409, message: `Incorrect ledger id ${ledgerId}` });
    }

    const ledgerReward = await Rewards.getLedgerReward(tx, ledgerId);
    if (!ledgerReward) {
      throw new Error(`ledger '${ledgerId}' not found`);
    }
    // Do not allow to use coin ledgers
    if (['iron', 'gold', 'markka'].includes(ledgerReward.creditType)) {
      logger.warn(`Cannot use ledger of type '${ledgerReward.creditType}'`);
      return [];
    }

    const {
      bonusCode,
      creditType,
      permalink,
      brandId,
      spinType,
      spinValue,
      spins,
      metadata: rewardMetadata,
    } = ledgerReward;
    const { permalink: p, ...reward } = ledgerReward;

    logger.debug('creditLedger', { playerId, creditType, permalink, bonusCode });
    if (creditType !== 'lootBox') await markLedgersUsed(tx, [ledgerId], playerId);

    let result: RewardWithLedgerId[] = [];
    // TODO: it might be problematic to call external services inside of transaction
    switch (creditType) {
      case 'freeSpins': {
        // EVO-OSS needs tableId for rewards, so we include it from gameParameters
        const rewardGame = await Games.getGameByPermalink(tx, permalink, brandId);
        const metadata = rewardGame?.parameters
          ? { ...rewardMetadata, ...rewardGame.parameters }
          : rewardMetadata;
        const response = await client.creditGameFreeSpins(brandId, playerId, {
          id: `${ledgerId}`,
          permalink: permalink || '',
          bonusCode: bonusCode || '',
          metadata,
          spinType,
          spinCount: spins,
          ...(spinValue ? { spinValue } : {}),
        });
        if (response.externalId && response.expires)
          await setLedgerExpiryAndExternalId(tx, ledger.id, response.externalId, response.expires);
        if (response.ok === true) result = [{ ledgerId, ...reward }];
        break;
      }
      case 'real':
      case 'bonus': {
        const response = await client.creditBonus(brandId, playerId, bonusCode);
        if (response.bonus) {
          result = [{ ledgerId, ...reward }];
        }
        break;
      }
      case 'depositBonus': {
        const response = await client.giveBonus(brandId, playerId, bonusCode);
        if (response.bonus) {
          result = [{ ledgerId, ...reward }];
        }
        break;
      }
      case 'lootBox':
        // eslint-disable-next-line no-use-before-define
        result = await openLootBox(tx, ledgerId);
        break;
      case 'wheelSpin':
        // eslint-disable-next-line no-use-before-define
        result = await useWheelSpin(tx, ledgerId, playerId);
        break;
      default:
        return Promise.reject({
          httpCode: 409,
          message: `creditType '${creditType}' not recognized`,
        });
    }

    // Attach games to rewards
    return Promise.all(
      result.map(async ({ ledgerId: l, ...r }) => ({
        reward: r,
        ledgerId: l,
        game: r.gameId && (await Games.getGameById(tx, r.gameId)),
      })),
    );
  });

// Needs to be alongside openLootBox to avoid circular dependencies
const getLootBoxLedger = async (knex: Knex, ledgerId: Id): Promise<LootBoxLedger> =>
  knex('ledgers')
    .select('rewards.price', 'rewards.currency', 'ledgers.playerId', 'brandId')
    .leftJoin('rewards', 'ledgers.rewardId', 'rewards.id')
    .leftJoin('reward_definitions', 'reward_definitions.id', 'rewards.rewardDefinitionId')
    .where({ 'ledgers.id': ledgerId, useDate: null, creditType: 'lootBox' })
    .first();

const getPlayerBalance = async (
  knex: Knex,
  playerId: Id,
  brandId: BrandId,
): Promise<PlayerBalance> => {
  const balances = await knex('ledgers')
    .innerJoin('reward_definitions', 'reward_definitions.id', 'ledgers.rewardDefinitionId')
    .select(
      'rewardType',
      'rewardDefinitionId',
      knex.raw(
        'cast(count(ledgers.id) filter (where expires is null or expires > now()) as integer) as credited',
      ),
      knex.raw(
        'cast(count(ledgers.id) filter (where "useDate" is not null and (expires is null or expires > now())) as integer) as used',
      ),
    )
    .where({ playerId, brandId })
    .whereIn('rewardType', ['iron', 'gold', 'markka'])
    .groupBy('rewardDefinitionId')
    .groupBy('rewardType');

  return balances.reduce((acc, { rewardType, ...curr }) => {
    acc[rewardType] = { ...curr, total: Math.max(curr.credited - curr.used, 0) };
    return acc;
  }, {});
};

const getPlayerCoins = (
  knex: Knex,
  brandId: BrandId,
  playerId: Id,
  currency: CasinoCurrency,
): Knex$QueryBuilder<Array<{ ledgerId: Id }>> =>
  knex('ledgers')
    .select('ledgers.id as ledgerId')
    .leftJoin('rewards', 'ledgers.rewardId', 'rewards.id')
    .leftJoin('reward_definitions', 'rewards.rewardDefinitionId', 'reward_definitions.id')
    .where({ brandId, playerId, creditType: currency, useDate: null })
    .modify(addExpiredCheck)
    .orderBy('creditDate', 'asc');

const getPlayerLedgersCount = async (
  knex: Knex,
  playerId: Id,
  excludeUsed: boolean = true,
): Promise<{ rewardDefinitionId: Id, count: number, rewardType: string }[]> =>
  knex('reward_definitions')
    .select('rewardDefinitionId', 'rewardType', knex.raw('cast (count(*) as integer) as count'))
    .leftJoin('ledgers', 'reward_definitions.id', 'ledgers.rewardDefinitionId')
    .where({ playerId })
    .modify((qb) => (excludeUsed ? qb.where({ useDate: null }) : qb))
    .modify(addExpiredCheck)
    .groupBy('ledgers.rewardDefinitionId', 'rewardType');

// Keep openLootBox in Ledgers to avoid circular dependencies
/**
 * @param knex: db
 * @param ledgerId: Id of previously credited loot box
 */
const openLootBox = async (knex: Knex, ledgerId: Id): Promise<RewardWithLedgerId[]> => {
  const lootBox = await getLootBoxLedger(knex, ledgerId);

  if (!lootBox) {
    throw new Error(`Lootbox ${ledgerId} not found`);
  }

  // Lock the loot box
  await knex('ledgers').where({ id: ledgerId }).forUpdate();

  const { price: lootBoxPrice, playerId, brandId } = lootBox;

  // $FlowFixMe[invalid-computed-prop]
  const { cost } = weightedRandom(KKLootBoxWeights[String(lootBoxPrice)]);

  return knex.transaction(async (tx) => {
    const favouriteGames = await getPlayerFavouriteGames(tx, playerId);
    const rewards = await getBoxRewards(tx, favouriteGames, cost, brandId, playerId);
    await markLedgersUsed(tx, [ledgerId], playerId);
    const result = [];
    await Promise.all(
      rewards.map(async (r) => {
        const ledger = await createLedger(tx, {
          rewardId: r.id,
          rewardDefinitionId: r.rewardDefinitionId,
          playerId,
          creditDate: new Date(),
          expires: r.validity ? moment().add(r.validity, 'hours').format() : null,
          source: 'exchange',
        });
        return result.push({ ...r, ledgerId: ledger.id });
      }),
    );

    return result;
  });
};

const useWheelSpin = async (
  knex: Knex,
  ledgerId: Id,
  playerId: Id,
): Promise<RewardWithLedgerId[]> => {
  const reward = await Rewards.getWheelSpinReward(knex);
  logger.info('useWheelSpin', { playerId, ledgerId, reward });

  const ledgers = [];
  if (reward) {
    const ledger = await createLedger(knex, {
      rewardId: reward.id,
      rewardDefinitionId: reward.rewardDefinitionId,
      playerId,
      creditDate: new Date(),
      expires: reward.validity ? moment().add(reward.validity, 'hours').format() : null,
      externalId: `${reward.externalId}-${ledgerId}`,
      source: 'exchange',
    });
    ledgers.push({ ...reward, ledgerId: ledger.id });
  }
  await createLedgersEvents(knex, [ledgerId], {
    event: 'wheelSpin-result',
    parameters: { externalRewardId: reward ? reward.externalId : 'nowin' },
  });

  return ledgers;
};

const usePlayerWheelSpin = async (
  knex: Knex,
  brandId: BrandId,
  playerId: Id,
): Promise<LedgerWithRewardAndGame[]> => {
  const wheelSpins = await getLedgersByRewardType(knex, brandId, playerId, 'wheelSpin');

  if (!wheelSpins.length) {
    return Promise.reject({ httpCode: 404, message: 'Player does not have wheel spins available' });
  }

  return useLedger(knex, playerId, wheelSpins[0].id);
};

module.exports = {
  createLedger,
  createLedgers,
  createLedgersEvents,
  creditReward,
  creditProgressReward,
  getLedger,
  getLedgers,
  getLedgersByRewardType,
  getLootBoxLedger,
  getPlayerBalance,
  getPlayerCoins,
  getPlayerLedgersCount,
  importLedgers,
  markLedgersUsed,
  markLedgerGroupUsed,
  openLootBox,
  useLedger,
  useWheelSpin,
  usePlayerWheelSpin,
};
