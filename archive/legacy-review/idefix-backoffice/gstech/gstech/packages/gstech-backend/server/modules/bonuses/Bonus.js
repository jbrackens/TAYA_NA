/* @flow */
import type { GameWithProfile } from '../games/Game';

const find = require('lodash/fp/find');
const moment = require('moment-timezone');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const transactions = require('../transactions');
const payments = require('../payments/Payment');
const Counter = require('../limits/Counter');
const settings = require('./settings');

export type Bonus = {
  id: Id,
  playerBonusId: ?Id,
  name: string,
  active: boolean,
  brandId: string,
  minAmount: Money,
  maxAmount: Money,
  depositBonus: boolean,
  depositCountMatch: boolean,
  depositCount: number,
  wageringRequirementMultiplier: number,
  depositMatchPercentage: number,
  archived: boolean,
  pnp: boolean,
};

export type BonusDraft = {
  name: string,
  minAmount: Money,
  maxAmount: Money,
  depositBonus: boolean,
  depositCount: number,
  depositCountMinimum: boolean,
  active: boolean,
  wageringRequirementMultiplier: number,
};

export type PlayerBonusStatus = 'available' | 'active' | 'completed' | 'forfeited' | 'expired';

export type PlayerBonus = {
  id: Id,
  balance: Money,
  wagered: Money,
  wageringRequirement: Money,
  currencyId: string
};

export type ExtendedPlayerBonus = {
  createdAt: Date,
  completedAt: Date,
  createdBy: string,
  forfeitedBy: string,
  name: string,
  status: PlayerBonusStatus,
  initialBalance: Money,
  expiryDate: ?Date,
  creditedBy: string,
  archived: boolean,
} & PlayerBonus;

const calculateBonusWagering = (game: GameWithProfile, amount: Money, currencyId: string) =>
  // $FlowFixMe[invalid-computed-prop]
  Math.min((Number(game.wageringMultiplier / 100) * amount), settings[currencyId].overbetLimit);

const turnBonusToReal = async (gameRoundId: ?Id, playerBonusId: Id, playerId: Id, bonusAmount: Money, tx: Knex) => {
  const updated: number = await tx('player_bonuses').update({ status: 'completed', completedAt: pg.raw('now()') }).where({ id: playerBonusId, status: 'active' });
  if (updated === 1) {
    if (bonusAmount === 0) return await transactions.expireBonus(playerId, { bonusAmount, playerBonusId }, tx);
    return await transactions.turnBonusToReal(playerId, { bonusAmount, gameRoundId, playerBonusId }, tx);
  }
  return Promise.reject('Bonus not active');
};
const wagerBonus = (playerBonusId: Id, gameRoundId: Id, playerId: Id, wageringAmount: Money, tx: Knex): Promise<boolean> =>
  tx('player_bonuses')
    .where({ id: playerBonusId })
    .update({ wagered: pg.raw('wagered + ?', wageringAmount) }, ['wagered', 'wageringRequirement', 'balance'])
    .then(([{ wagered, wageringRequirement, balance: playerBonusBalance }]) => {
      logger.debug('Wager bonus', JSON.stringify({ playerId, gameRoundId, playerBonusId, wageringAmount, wagered, wageringRequirement }));
      if (wagered >= wageringRequirement) {
        return turnBonusToReal(gameRoundId, playerBonusId, playerId, playerBonusBalance, tx)
          .then(() => true);
      }
      return false;
    });

const doMaintenance = async (playerId: Id, tx: Knex$Transaction<any>) => {
  const activeBonuses = await tx('player_bonuses')
    .innerJoin('players', 'players.id', 'player_bonuses.playerId')
    .innerJoin('base_currencies', 'players.currencyId', 'base_currencies.id')
    .select(['player_bonuses.id', 'player_bonuses.balance'])
    .where({ playerId, status: 'active' })
    .whereRaw('(player_bonuses.balance / base_currencies."defaultConversion") < ?', settings.smallBonusConversionThreshold)
    .whereRaw('(players."bonusBalance" / base_currencies."defaultConversion") < ?', settings.smallBonusConversionThreshold);
  await Promise.all(activeBonuses.map(bonus => turnBonusToReal(null, bonus.id, playerId, bonus.balance, tx)));
  await Counter.resetDepositWageringCounters(playerId, tx);
};

const creditBonus = async (bonusId: Id, playerId: Id, amount: Money, creditUserId: ?Id, setExpiryDate: ?Date, db: Knex = pg): Promise<Id> =>
  db.transaction(async (tx) => {
    await doMaintenance(playerId, tx);
    const bonus: { wageringRequirementMultiplier: number, daysUntilExpiration: number, maxAmount: number } = (await tx('bonuses')
      .innerJoin('players', 'players.id', pg.raw('?', playerId))
      .leftOuterJoin('player_bonuses', {
        'players.id': 'player_bonuses.playerId',
        'player_bonuses.bonusId': 'bonuses.id',
      })
      .leftOuterJoin('bonus_limits', {
        'players.currencyId': 'bonus_limits.currencyId',
        'bonuses.id': 'bonus_limits.bonusId',
      })
      .first('wageringRequirementMultiplier', 'daysUntilExpiration', 'maxAmount')
      .whereRaw('(player_bonuses.id is null or "creditOnce" = false)')
      .where({ 'bonuses.id': bonusId, active: true }): any);
    if (bonus == null) {
      throw new Error(errorCodes.INVALID_BONUS_ID.message);
    }
    const { maxAmount, wageringRequirementMultiplier, daysUntilExpiration } = bonus;
    const bonusAmount = maxAmount != null ? Math.min(maxAmount, amount) : amount;
    const expiryDate = setExpiryDate != null ? setExpiryDate : moment().add(daysUntilExpiration, 'days').toDate();
    const [{ id: playerBonusId }] = await tx('player_bonuses')
      .insert({
        bonusId,
        playerId,
        initialBalance: bonusAmount,
        creditUserId,
        expiryDate,
        wageringRequirement: bonusAmount * wageringRequirementMultiplier,
      })
      .returning('id');
    await transactions.creditBonus(playerId, { playerBonusId, bonusAmount }, tx);
    if (wageringRequirementMultiplier === 0) {
      await turnBonusToReal(null, playerBonusId, playerId, bonusAmount, tx);
    }
    return playerBonusId;
  });

const activateBonus = async (playerBonusId: Id, bonusId: Id, playerId: Id, amount: Money, creditUserId: ?Id, setExpiryDate: ?Date, tx: Knex$Transaction<any> = (pg: any)): Promise<Id> => {
  const bonus: { wageringRequirementMultiplier: number, daysUntilExpiration: number, maxAmount: number } = (await tx('bonuses')
    .innerJoin('players', 'players.id', pg.raw('?', playerId))
    .leftOuterJoin('player_bonuses', {
      'players.id': 'player_bonuses.playerId',
      'player_bonuses.bonusId': 'bonuses.id',
    })
    .innerJoin('bonus_limits', {
      'players.currencyId': 'bonus_limits.currencyId',
      'bonuses.id': 'bonus_limits.bonusId',
    })
    .first('wageringRequirementMultiplier', 'daysUntilExpiration', 'maxAmount')
    .whereRaw('(player_bonuses.id is null or "creditOnce" = false)')
    .where({ 'bonuses.id': bonusId, active: true }): any);
  if (bonus == null) {
    throw new Error(errorCodes.INVALID_BONUS_ID.message);
  }
  const { wageringRequirementMultiplier, daysUntilExpiration, maxAmount } = bonus;
  const bonusAmount = Math.min(maxAmount, amount);
  const expiryDate = setExpiryDate != null ? setExpiryDate : moment().add(daysUntilExpiration, 'days').toDate();
  await tx('player_bonuses')
    .update({ initialBalance: bonusAmount, creditUserId, expiryDate, wageringRequirement: bonusAmount * wageringRequirementMultiplier, status: 'active' })
    .where({ id: playerBonusId, playerId, status: 'available' })
    .returning('id');
  await transactions.creditBonus(playerId, { playerBonusId, bonusAmount }, tx);
  return playerBonusId;
};

const getAvailableDepositBonuses = (playerId: Id): Knex$QueryBuilder<Bonus[]> =>
  pg('bonuses')
    .innerJoin('players', {
      'bonuses.brandId': 'players.brandId',
    })
    .innerJoin('bonus_limits', {
      'bonuses.id': 'bonus_limits.bonusId',
      'players.currencyId': 'bonus_limits.currencyId',
    })
    .leftOuterJoin('player_bonuses', {
      'bonuses.id': 'player_bonuses.bonusId',
      'players.id': 'player_bonuses.playerId',
    })
    .select(
      'bonuses.id as id',
      'name',
      'player_bonuses.id as playerBonusId',
      'bonus_limits.minAmount as minAmount',
      'bonus_limits.maxAmount as maxAmount',
      'bonuses.depositMatchPercentage as depositMatchPercentage',
      'bonuses.depositBonus as depositBonus',
      'bonuses.depositCount as depositCount',
      'bonuses.wageringRequirementMultiplier as wageringRequirementMultiplier',
    )
    .where({ 'players.id': playerId, active: true })
    .whereRaw(`(player_bonuses.id is null and (
        (bonuses."depositCountMatch" = true and bonuses."depositCount" = (players."numDeposits" + 1) and "depositBonus" = true)
        or
        (bonuses."depositCountMatch" = false and bonuses."depositCount" <= (players."numDeposits" +1) and "depositBonus" = true)
      ) or player_bonuses.status = ?)`, 'available')
    .orderBy('bonuses.id');

const getAvailableBonuses = (playerId: Id): Knex$QueryBuilder<Bonus[]> =>
  pg('bonuses')
    .innerJoin('players', {
      'bonuses.brandId': 'players.brandId',
    })
    .leftOuterJoin('bonus_limits', {
      'bonuses.id': 'bonus_limits.bonusId',
      'players.currencyId': 'bonus_limits.currencyId',
    })
    .leftOuterJoin('player_bonuses', {
      'bonuses.id': 'player_bonuses.bonusId',
      'players.id': 'player_bonuses.playerId',
    })
    .select(
      'bonuses.id',
      'name',
      'bonus_limits.minAmount as minAmount',
      'bonus_limits.maxAmount as maxAmount',
      'bonuses.wageringRequirementMultiplier as wageringRequirementMultiplier',
    )
    .where({ 'players.id': playerId, active: true })
    .whereRaw('(player_bonuses.id is null or "creditOnce" = false)')
    .orderBy('bonuses.name');

const getAvailablePnpDepositBonusesByBrand = (
  brandId: string,
  currencyId: string = 'EUR',
): Knex$QueryBuilder<Bonus[]> =>
  pg('bonuses')
    .innerJoin('bonus_limits', {
      'bonuses.id': 'bonus_limits.bonusId',
    })
    .select(
      'bonuses.id',
      'name',
      'bonus_limits.minAmount as minAmount',
      'bonus_limits.maxAmount as maxAmount',
      'bonuses.depositMatchPercentage as depositMatchPercentage',
      'bonuses.wageringRequirementMultiplier as wageringRequirementMultiplier',
    )
    .where({
      'bonus_limits.currencyId': currencyId,
      'bonuses.brandId': brandId,
      active: true,
      creditOnce: true,
      depositBonus: true,
      pnp: true,
    })
    .orderBy('bonuses.id');

const getAvailableBonusesByBrand = (brandId: string): Knex$QueryBuilder<Bonus[]> =>
  pg('bonuses')
    .where({ brandId })
    .select('*')
    .orderBy('active', 'desc')
    .orderBy('name'); // FIXME no * select

const updateBonus = (bonusId: Id, bonusDraft: BonusDraft): Knex$QueryBuilder<Bonus> =>
  pg('bonuses').where({ id: bonusId }).update(bonusDraft);

const createBonus = (bonusDraft: BonusDraft): any =>
  pg('bonuses')
    .insert(bonusDraft)
    .returning('*')
    .then(([bonus]) => bonus);

// TODO: substitute this queries with one join
const getBonus = (bonusId: Id): Knex$QueryBuilder<Bonus> =>
  pg('bonuses').first('*').where({ id: bonusId });

const getBrandCurrencies = (brandId: string): any =>
  pg('currencies')
    .select('*')
    .where({ brandId })
    .then(currencies => currencies.map(({ id }) => id));

const getBonusLimits = (
  bonusId: Id,
  brandId: string,
): Promise<{ currencyId: string, bonusId: Id, minAmount: Money, maxAmount: Money }[]> =>
  pg('currencies')
    .select(
      'currencies.id as currencyId',
      'bonus_limits.bonusId',
      'bonus_limits.minAmount',
      'bonus_limits.maxAmount',
    )
    .leftOuterJoin('bonus_limits', (qb) =>
      qb
        .on('currencies.id', 'bonus_limits.currencyId')
        .on('bonus_limits.bonusId', pg.raw('?', bonusId)),
    )
    .where({ 'currencies.brandId': brandId });

const upsertBonusLimit = (bonusId: Id, currencyId: string, minAmount: number, maxAmount: number): any =>
  pg.raw('insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (?,?,?,?)'
       + ' on conflict("bonusId", "currencyId") do update set "minAmount" = excluded."minAmount", "maxAmount" = excluded."maxAmount"'
       + ' returning *', [bonusId, currencyId, minAmount, maxAmount])
    .then(result => result.rows[0]);

const getBonuses = (playerId: Id): Knex$QueryBuilder<ExtendedPlayerBonus[]> =>
  pg('player_bonuses')
    .innerJoin('bonuses', 'bonuses.id', 'player_bonuses.bonusId')
    .leftOuterJoin('users as creditUser', 'creditUser.id', 'player_bonuses.creditUserId')
    .leftOuterJoin('users as forfeitUser', 'forfeitUser.id', 'player_bonuses.forfeitUserId')
    .select([
      'balance',
      'bonuses.name',
      'bonuses.archived',
      'player_bonuses.id',
      'bonusId',
      'wagered',
      'wageringRequirement',
      'initialBalance',
      'status',
      'expiryDate',
      'player_bonuses.createdAt',
      'completedAt',
      'creditUser.handle as creditedBy',
      'forfeitUser.handle as forfeitedBy',
    ])
    .where({ playerId })
    .orderBy('player_bonuses.createdAt', 'desc');

const getActiveBonuses = (playerId: Id): Knex$QueryBuilder<PlayerBonus[]> =>
  pg('player_bonuses')
    .select(['currencyId', 'player_bonuses.balance', 'player_bonuses.id', 'bonusId', 'wagered', 'wageringRequirement', 'initialBalance'])
    .innerJoin('players', 'players.id', 'player_bonuses.playerId')
    .where({ status: 'active', 'players.id': playerId })
    .orderBy('id');

const adjustBonusBalance = async (playerId: Id, bonuses: Array<PlayerBonus>, amount: Money, tx: Knex) => {
  if (bonuses.length > 0) {
    const bonus = find((b: PlayerBonus) => b.balance + amount > 0)(bonuses);
    if (bonus != null && bonus.balance + amount > 0) {
      return await tx('player_bonuses').update({ balance: pg.raw('balance + ?', amount) }).where({ id: bonus.id });
    }
    throw Error(`Invalid bonus state player ${playerId}. Unable to decrease bonus amount #{amount}`);
  }
  if (amount > 0) {
    // has bonus balance, but no active bonus. clear bonus balance and create a correction
    await tx('players').update({ bonusBalance: 0 }).where({ id: playerId });
    return await payments.addTransaction(playerId, null, 'correction', amount, 'Player had bonus balance but no active bonus. Bonus balance moved to real.', null, tx);
  }
  throw Error(`Invalid bonus state player ${playerId}`);
};

const getValidatedActiveBonuses = async (playerId: Id, bonusBalance: Money, tx: Knex): Promise<Array<PlayerBonus>> => {
  const bonuses = await getActiveBonuses(playerId).transacting(tx);
  const bonusBalanceTotal = bonuses.map(({ balance: b }) => b).reduce((a, b) => a + b, 0);
  if (bonusBalance > bonusBalanceTotal) {
    logger.warn('bonusBalance not in sync with remaining bonuses', { playerId, bonusBalance, bonusBalanceTotal });
    await adjustBonusBalance(playerId, bonuses, bonusBalance - bonusBalanceTotal, tx);
    return getActiveBonuses(playerId);
  }
  if (bonusBalance < bonusBalanceTotal) {
    logger.warn('bonusBalance not in sync with remaining bonuses', { playerId, bonusBalance, bonusBalanceTotal });
    await adjustBonusBalance(playerId, bonuses, bonusBalance - bonusBalanceTotal, tx);
    return getActiveBonuses(playerId);
  }
  return bonuses;
};

const getBonusByCode = async (playerId: Id, bonusCode: string, tx: Knex$Transaction<Array<Bonus>>): Promise<?Bonus> => {
  const availableBonuses = await getAvailableBonuses(playerId).transacting(tx);
  const bonus = find((b: Bonus) => b.name === bonusCode)(availableBonuses);
  return bonus;
};

const creditManualBonus = async (playerId: Id, bonusCode: string, amount: Money, expireDate: ?Date, userId: Id): Promise<any> =>
  pg.transaction(async (tx) => {
    const bonus = await getBonusByCode(playerId, bonusCode, tx);
    if (bonus == null) {
      return Promise.reject('Bonus not available');
    }
    return await creditBonus(bonus.id, playerId, amount, userId, expireDate, tx);
  });

const raiseWageringRequirement = (playerBonusId: Id, amount: Money): Knex$QueryBuilder<any> =>
  pg('player_bonuses')
    .where({ id: playerBonusId })
    .update({ wageringRequirement: pg.raw('"wageringRequirement" + ?', amount) });

const processBonusWin = async (playerId: Id, gameRoundId: Id, winAmount: Money, bonusWin: Money, bonusBets: Money, totalBets: Money, tx: Knex$Transaction<any>): Promise<?Id> => {
  const activeBonuses = await getActiveBonuses(playerId).transacting(tx).forUpdate();
  if (activeBonuses.length === 0) {
    return null;
  }
  const [{ id: playerBonusId, currencyId }] = activeBonuses;
  // $FlowFixMe[invalid-computed-prop]
  if (totalBets > settings[currencyId].overbetLimit) {
    // TODO fraud notification for overbetting
    /*
      Handle overbets. When player used bonus money and bet size was over
      limit, wagering requirement of bonus raises.

      For example:
      - 8€ bet when limit is 5€, overbet is 3€ and overbet WR 50
      - Bets 8€, Wins 100€. Overbet is 3€.
      - Win from overbet is 100€ * (3€ / 8€) = 37.50€
      - Wagering requirement for bonus grows by 50 x 37.50€ = 1875€
    */
    // $FlowFixMe[invalid-computed-prop]
    const overbetAmount = totalBets - settings[currencyId].overbetLimit;
    const overbetRaise = (overbetAmount / totalBets) * winAmount * settings.overbetWageringRequirement;
    logger.debug('Overbet wagering', { playerId, gameRoundId, winAmount, bonusWin, bonusBets, totalBets, overbetAmount, overbetRaise });
    await raiseWageringRequirement(playerBonusId, overbetRaise).transacting(tx);
  }
  return playerBonusId;
};

const processBonusWagerings = async (playerId: Id, bonuses: PlayerBonus[], game: GameWithProfile, gameRoundId: Id, totalBetSize: Money, tx: Knex) => {
  const [{ currencyId }] = bonuses;
  const totalWageringAmount = calculateBonusWagering(game, totalBetSize, currencyId);
  const wagerOperations = [];
  bonuses.reduce((wagering, bonus) => {
    const wagerThisBonus = Math.min(wagering, bonus.wageringRequirement - bonus.wagered);
    if (wagerThisBonus) {
      wagerOperations.push(wagerBonus(bonus.id, gameRoundId, playerId, wagerThisBonus, tx));
    }
    return wagering - wagerThisBonus;
  }, totalWageringAmount);
  await Promise.all(wagerOperations);
};

const forfeitBonus = async (knex: Knex, playerId: Id, playerBonusId: Id, forfeitUserId: ?Id) => {
  const [bonus] = await knex('player_bonuses')
    .select('balance')
    .where({ status: 'active', playerId, id: playerBonusId })
    .forUpdate();

  if (bonus == null) {
    throw new Error('Unable to forfeit bonus - not active');
  }
  await Promise.all([
    knex('player_bonuses').update({ status: 'forfeited', completedAt: pg.raw('now()'), forfeitUserId }).where({ id: playerBonusId }),
    transactions.forfeitBonus(playerId, { bonusAmount: bonus.balance, playerBonusId }, knex),
  ]);
};

const expireBonus = (playerBonusId: Id): any =>
  pg.transaction(async (tx) => {
    const bonus = await tx('player_bonuses')
      .first(['balance', 'playerId'])
      .where({ status: 'active', id: playerBonusId })
      .whereRaw('"expiryDate" < NOW()')
      .forUpdate();

    if (bonus == null) {
      throw new Error('Unable to expire bonus - not active');
    }
    await Promise.all([
      tx('player_bonuses').update({ status: 'expired', completedAt: pg.raw('now()') }).where({ id: playerBonusId }),
      transactions.expireBonus(bonus.playerId, { bonusAmount: bonus.balance, playerBonusId }, tx),
    ]);
  });

const getExpiredBonuses = (): Knex$QueryBuilder<{id: Id}[]> => pg('player_bonuses').select('id').whereRaw('"expiryDate" < NOW()').where({ status: 'active' });

const giveBonus = async (playerId: Id, bonusId: Id, creditUserId: ?Id): Promise<mixed> =>
  pg.transaction(async (tx) => {
    const bonus = await tx('bonuses').first('id').where({ id: bonusId, active: true });
    if (bonus == null) {
      throw new Error(errorCodes.INVALID_BONUS_ID.message);
    }
    try {
      const [{ id: playerBonusId }] = await tx('player_bonuses')
        .insert({ bonusId, playerId, creditUserId, status: 'available' })
        .returning('id');
      return playerBonusId;
    } catch (e) {
      if (e.constraint === 'player_bonuses_one_instance_available_per_bonusId') {
        return null;
      }
      throw e;
    }
  });

const archiveBonus = (bonusId: Id): Knex$QueryBuilder<Bonus> =>
  pg('bonuses').where({ id: bonusId }).update({ archived: true, active: false });


module.exports = {
  activateBonus,
  creditBonus,
  giveBonus,
  getBonuses,
  processBonusWagerings,
  getValidatedActiveBonuses,
  getActiveBonuses,
  getAvailableDepositBonuses,
  getAvailableBonuses,
  getAvailableBonusesByBrand,
  getAvailablePnpDepositBonusesByBrand,
  updateBonus,
  createBonus,
  getBonus,
  getBrandCurrencies,
  getBonusLimits,
  upsertBonusLimit,
  getExpiredBonuses,
  forfeitBonus,
  processBonusWin,
  creditManualBonus,
  expireBonus,
  doMaintenance,
  getBonusByCode,
  archiveBonus,
};
