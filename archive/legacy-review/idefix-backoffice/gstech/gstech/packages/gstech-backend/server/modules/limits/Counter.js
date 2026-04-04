/* @flow */
import type { GameWithProfile } from '../games/Game';

const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const walletErrorCodes = require('gstech-core/modules/errors/wallet-error-codes');
const settings = require('../bonuses/settings');

export type GameCounterType = 'bet' | 'promotion' | 'promotion_wins' | 'promotion_wins_ratio' | 'deposit_campaign'; // These counters depend on game play and require game information
export type DepositCounterType = 'deposit_wager' | 'deposit_amount' | 'loss'; // These counters do not need game information
export type DepositWageringCounterType = 'deposit_wager' | 'deposit_campaign'; // These counters are for calculating deposit wagering

export type WageringCounterType = GameCounterType | DepositCounterType;
export type WageringCounter = {
  name: ?string,
  amount: Money,
  limit: Money,
  type: WageringCounterType,
  id: Id,
  promotionId: ?Id,
  active: boolean,
}

export type CounterUpdateResult = {
  type: WageringCounterType,
  limitId: ?Id,
  contribution: Money,
  progress: Money,
} & WageringCounter

const createDepositWageringCounter = (playerId: Id, amount: Money, paymentId: Id, type: DepositWageringCounterType, tx: Knex$Transaction<any>): Knex$QueryBuilder<any> =>
  tx('player_counters').insert({ playerId, limit: amount, paymentId, type }).returning('*');

const adjustDepositWageringCounter = (id: Id, amount: Money, tx: Knex$Transaction<any>): Knex$QueryBuilder<any> =>
  tx('player_counters').update({ limit: pg.raw('"limit" + ?', amount) }).where({ id });

const setDepositWageringCounter = (id: Id, limit: Money, tx: Knex): Knex$QueryBuilder<any> =>
  tx('player_counters').update({ limit }).where({ id }).returning('*');

const disableDepositWageringCounter = (id: Id, tx: Knex$Transaction<any>): Knex$QueryBuilder<any> =>
  tx('player_counters').update({ active: false }).where({ id }).returning('*');

const resetDepositWageringCounters = async (playerId: Id, tx: Knex$Transaction<any>): Promise<any> =>
  tx.raw(`UPDATE player_counters
    SET active=false
    FROM players
    LEFT JOIN base_currencies on base_currencies.id=players."currencyId"
    WHERE player_counters.type in ('deposit_campaign')
    AND player_counters."playerId"=players.id
    AND player_counters.active=true
    AND (players."bonusBalance" + players.balance) / base_currencies."defaultConversion" < 200
    AND player_counters."playerId"=?`, [playerId]);

const updateCounters = (playerId: Id): Promise<void> =>
  pg('player_counters')
    .update({ active: false })
    .where({ active: true })
    .whereIn('type', ['deposit_wager', 'deposit_campaign'])
    .whereRaw('"amount" >= "limit"')
    .where({ playerId });

const getActiveCounters = (playerId: Id, types: WageringCounterType[], includeCompleted?: boolean): Knex$QueryBuilder<WageringCounter[]> =>
  pg('player_counters')
    .leftOuterJoin('promotions', 'player_counters.promotionId', 'promotions.id')
    .select('player_counters.id', 'type', 'amount', 'limit', 'promotionId', 'player_counters.active', 'name')
    .where({ playerId, 'player_counters.active': true })
    .whereIn('type', types)
    .modify(qb => !includeCompleted && qb.whereRaw('("amount" < "limit" OR "limit" is null)'))
    .orderBy('player_counters.createdAt');

const getWageringRequirementCounter = async (playerId: Id): Promise<{amount: Money, limit: Money, type?: WageringCounterType}> => {
  const row = await pg('player_counters')
    .first(pg.raw('sum("amount") as "amount"'), pg.raw('sum("limit") as "limit"'), 'type')
    .where({ playerId, active: true })
    .whereIn('type', ['deposit_wager', 'deposit_campaign'])
    .whereRaw('"amount" < "limit"')
    .groupBy('type')
    .having(pg.raw('sum("limit") > sum("amount")'))
    .orderBy(pg.raw('(sum("limit") - sum("amount"))'), 'desc');

  if (row) {
    const { amount, limit, type } = row;
    return {
      amount: amount || 0,
      limit: limit || 0,
      type: type || undefined,
    };
  }
  return { amount: 0, limit: 0, type: undefined };
};

const updateLimit = async (tx: Knex$Transaction<any>, playerId: Id, amount: Money, type: DepositCounterType[]) => {
  const week = Number(moment().format('YYYYWW'));
  const month = Number(moment().format('YYYYMM'));
  const date = Number(moment().format('YYYYMMDD'));
  const [updateStmt, returningStmt] = tx('player_counters')
    .update('amount', tx.raw('?? + ?', ['player_counters.amount', amount]))
    .returning([
      'player_counters.id',
      'player_counters.type',
      'player_counters.limitId',
      'player_counters.limit',
      'player_counters.amount',
      'promotions.name',
      'promotions.multiplier',
    ])
    .toString()
    .split(' returning ');
  const joinStmt = tx('player_counters as c')
    .leftJoin('promotions', 'c.promotionId', 'promotions.id')
    .whereIn('c.id', (qb) =>
      qb.union(
        [
          tx('player_counters as d')
            .first('id')
            .where('d.playerId', playerId)
            .where('d.active', true)
            .whereRaw('?? <= ??', ['d.amount', 'd.limit'])
            .whereIn('d.type', ['deposit_wager', 'deposit_campaign']),
          tx('player_counters as e')
            .select('id')
            .where('e.playerId', playerId)
            .where('e.active', true)
            .whereNotIn('e.type', ['deposit_wager', 'deposit_campaign']),
        ],
        true,
      ),
    )
    .whereRaw('?? = ??', ['c.id', 'player_counters.id'])
    .where('player_counters.playerId', playerId)
    .whereIn('c.type', type)
    .whereIn('c.week', [week, 0, null])
    .whereIn('c.month', [month, 0, null])
    .whereIn('c.date', [date, 0, null])
    .toString()
    .replace('select *', '')
    .trim();

  const result = await tx.raw(`${updateStmt} ${joinStmt} returning ${returningStmt}`);
  const r = result.rows;

  const deposits = r.filter(t => t.type === 'deposit_amount');
  if (deposits.length > 0) {
    logger.debug('Update deposit limits', playerId, deposits);
  }
  return r;
};

const updateGameLimit = async (
  tx: Knex,
  playerId: Id,
  amount: Money,
  game: GameWithProfile,
  type: WageringCounterType[],
  winRatio?: number = 0,
): any => {
  const result = await tx.raw(
    `
  WITH counter_updates AS (
    SELECT (
      CASE
        WHEN
          c.type = 'promotion' AND promotions."calculateRounds" = true THEN (
            CASE WHEN (:wageringMultiplier/100.0 * promotions.multiplier/100.0 * :amount) / base_currencies."defaultConversion" >= promotions."minimumContribution"
              THEN 100
              ELSE 0
            END
          )
        WHEN
          c.type = 'promotion' THEN (
            CASE WHEN (:wageringMultiplier/100.0 * promotions.multiplier/100.0 * :amount) / base_currencies."defaultConversion" >= promotions."minimumContribution"
              THEN (:wageringMultiplier/100.0 * promotions.multiplier/100.0 * :amount)
              ELSE 0
            END
          )
        WHEN
          c.type = 'promotion_wins' THEN (
            CASE WHEN (promotions.multiplier/100.0 * :amount) / base_currencies."defaultConversion" >= promotions."minimumContribution"
              THEN (promotions.multiplier/100.0 * :amount)
              ELSE 0
            END
          )
        WHEN
          c.type = 'promotion_wins_ratio' THEN (
            CASE WHEN (promotions.multiplier/100.0 * :winRatio) >= promotions."minimumContribution"
              THEN (promotions.multiplier/100.0 * :winRatio)
              ELSE 0
            END
          )
        WHEN
          c.type = 'deposit_campaign' THEN
            (:wageringMultiplier/100.0 * :amount)
        ELSE
          :amount
        END
      ) AS amount, c.id AS id, c.type as type, promotions.name AS name, promotions."calculateRounds" as "calculateRounds", base_currencies."defaultConversion" as "defaultConversion"
      FROM player_counters c
      JOIN players on c."playerId"=players.id
      JOIN base_currencies on players."currencyId"=base_currencies.id
      LEFT OUTER JOIN promotions ON c."promotionId" = promotions.id
      LEFT OUTER JOIN promotion_games ON promotions.id=promotion_games."promotionId" AND promotion_games."gameId"=:gameId
      WHERE c.id in (
        (SELECT id FROM player_counters d WHERE d."playerId"=:playerId and d.active = true AND d.amount <= d."limit" and d.type in ('deposit_wager') ORDER by id LIMIT 1)
        UNION
        (SELECT id FROM player_counters d WHERE d."playerId"=:playerId and d.active = true AND d.amount <= d."limit" and d.type in ('deposit_campaign') ORDER BY id LIMIT 1)
        UNION
        (SELECT id FROM player_counters e WHERE e."playerId"=:playerId and e.active = true AND e.type not in ('deposit_campaign', 'deposit_wager'))
      )
      AND c."playerId"=:playerId AND (promotions.id IS NULL OR promotions.active)
      AND (promotions.id IS NULL OR promotions."allGames" OR promotion_games."gameId" IS NOT NULL)
    AND c.type in (${tx.raw(type.map(() => '?').join(','), [...type]).toString()})
    and (c.week = :week or c.week = 0 or c.week is null) and (c.month = :month or c.month = 0 or c.month is null) and (c.date = :date or c.date = 0 or c.date is null))
      UPDATE player_counters
          SET amount = CASE WHEN counter_updates.type = 'promotion_wins_ratio'
            THEN (
              CASE WHEN player_counters.amount >= counter_updates.amount
                THEN player_counters.amount
                ELSE counter_updates.amount
              END)
            ELSE player_counters.amount + counter_updates.amount
          END
      FROM counter_updates WHERE player_counters.id=counter_updates.id
      RETURNING
        player_counters.id,
        player_counters.type,
        player_counters."limitId",
        player_counters.limit,
        player_counters.amount,
        counter_updates.name,
        case when counter_updates."calculateRounds" = true THEN counter_updates.amount ELSE player_counters.amount / counter_updates."defaultConversion" END AS progress,
        case when counter_updates."calculateRounds" = true THEN counter_updates.amount ELSE counter_updates.amount / counter_updates."defaultConversion" END AS contribution`,
    {
      amount,
      playerId,
      winRatio,
      gameId: game.id,
      wageringMultiplier: game.wageringMultiplier,
      week: Number(moment().format('YYYYWW')),
      month: Number(moment().format('YYYYMM')),
      date: Number(moment().format('YYYYMMDD')),
    },
  );
  const r = result.rows;

  const overflow = r
    .filter((t) => t.type === 'deposit_wager' || t.type === 'deposit_campaign')
    .filter((t) => t.amount > t.limit);
  if (overflow.length > 0) {
    const of = overflow[0];
    await updateGameLimit(tx, playerId, of.amount - of.limit, game, [
      'deposit_campaign',
      'deposit_wager',
    ]);
  }
  return r;
};

const updateCounterWithBet = async (playerId: Id, amount: Money, usingBonusMoney: boolean, currencyId: string, game: GameWithProfile, tx: Knex): Promise<CounterUpdateResult[]> => {
  let limits;
  if (usingBonusMoney) {
    // $FlowFixMe[invalid-computed-prop]
    const promotionLimits = await updateGameLimit(tx, playerId, Math.min(amount, settings[currencyId].overbetLimit), game, ['deposit_campaign', 'promotion']);
    const wageringLimits = await updateGameLimit(tx, playerId, amount, game, ['deposit_wager', 'bet', 'loss']);
    limits = [...promotionLimits, ...wageringLimits];
  } else {
    limits = await updateGameLimit(tx, playerId, amount, game, ['promotion', 'deposit_wager', 'bet', 'loss', 'deposit_campaign']);
  }

  for (const limit of limits) {
    if (limit.type === 'bet' || limit.type === 'loss') {
      if (limit.amount > limit.limit) {
        return Promise.reject(walletErrorCodes.PLAY_LIMIT_REACHED);
      }
    }
  }
  return limits;
};

const updateLimitWithWin = async (
  playerId: Id,
  amount: Money,
  winRatio: number,
  game: GameWithProfile,
  tx: Knex$Transaction<any>,
): Promise<any> =>
  Promise.all([
    updateLimit(tx, playerId, -amount, ['loss']),
    updateGameLimit(tx, playerId, amount, game, ['promotion_wins', 'promotion_wins_ratio'], winRatio),
  ]);

const updateLimitWithDeposit = (playerId: Id, amount: Money, tx: Knex$Transaction<any>): Promise<any> =>
  updateLimit(tx, playerId, amount, ['deposit_amount']);

const depositLimitRemaining = async (playerId: Id): Promise<number> => {
  const limit = await pg('player_counters')
    .first('amount', 'limit')
    .innerJoin('player_limits', 'player_limits.id', 'player_counters.limitId')
    .where({
      'player_counters.playerId': playerId,
      'player_limits.active': true,
      'player_counters.active': true,
      'player_counters.type': 'deposit_amount',
    })
    .whereIn('week', [Number(moment().format('YYYYWW')), 0])
    .whereIn('month', [Number(moment().format('YYYYMM')), 0])
    .whereIn('date', [Number(moment().format('YYYYMMDD')), 0])
    .where((qb) =>
      qb.whereNull('player_limits.expires').orWhere('player_limits.expires', '>', 'now'),
    )
    .orderBy(pg.raw('"amount" - "limit"'), 'desc');

  if (limit != null) {
    logger.debug('depositLimitRemaining', playerId, limit, limit.limit - limit.amount);
    return Math.max(0, limit.limit - limit.amount);
  }
  return Number.MAX_SAFE_INTEGER;
};


module.exports = {
  depositLimitRemaining,
  updateCounterWithBet,
  updateLimitWithWin,
  updateLimitWithDeposit,
  createDepositWageringCounter,
  adjustDepositWageringCounter,
  disableDepositWageringCounter,
  resetDepositWageringCounters,
  setDepositWageringCounter,
  updateCounters,
  getActiveCounters,
  getWageringRequirementCounter,
};
