/* @flow */
import type { GameWithProfile } from '../games/Game';
import type { PlayerBonus } from '../bonuses/Bonus';
import type { CounterUpdateResult } from '../limits/Counter';

const tail = require('lodash/fp/tail');
const first = require('lodash/fp/first');
const last = require('lodash/fp/last');
const any = require('lodash/fp/any');
const moment = require('moment-timezone');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const walletErrorCodes = require('gstech-core/modules/errors/wallet-error-codes');
const { wagerWin, wagerBet } = require('./WageringEvent');
const { processBonusWin, getValidatedActiveBonuses, processBonusWagerings } = require('../bonuses/Bonus');
const { getBalance, getBalanceWithGameplayForUpdate } = require('../players');
const { updateBetCounters, updateLimitWithWin } = require('../limits');
const { getActivePromotions } = require('../promotions');
const transactions = require('../transactions');
const Optimove = require('../core/optimove');

const updateSessionWin = (sessionId: Id, realWin: Money, bonusWin: Money) =>
  pg('sessions').update({
    realWin: pg.raw('"realWin" + ?', realWin),
    bonusWin: pg.raw('"bonusWin" + ?', bonusWin),
  }).where({ id: sessionId });

const updateSessionBet = (sessionId: Id, realBalanceToUse: Money, bonusBalanceToUse: Money) =>
  pg('sessions').update({
    realBet: pg.raw('"realBet" + ?', realBalanceToUse),
    bonusBet: pg.raw('"bonusBet" + ?', bonusBalanceToUse),
  }).where({ id: sessionId });

const choosePartition = (date: Date) => {
  const time0 = moment(date).subtract(1, 'month').startOf('month').toISOString();
  const time1 = moment(date).add(1, 'month').endOf('month').toISOString();
  return `timestamp between '${time0}' and '${time1}'`;
};

const betsForGameRound = async (gameRoundId: Id, roundStartTime: Date, tx: Knex): Promise<{ realBets: Money, bonusBets: Money }> => {
  const [{ realBets, bonusBets }] = await tx('transactions')
    .sum('amount as realBets')
    .sum('bonusAmount as bonusBets')
    .where({ gameRoundId, type: 'bet' })
    .whereRaw(choosePartition(roundStartTime));
  return { realBets: realBets || 0, bonusBets: bonusBets || 0 };
};

const findGameRound = async (
  tx: Knex$Transaction<any>,
  manufacturerId: string,
  externalGameRoundId: string,
  closeRound: boolean,
  timestamp: ?Date,
): Promise<?Id> => {
  const gameRounds = await (closeRound
    ? tx('game_rounds')
        .update({ closed: true })
        .where({ manufacturerId, externalGameRoundId }) // reminder: this is unique constraint for game_rounds table!
        .modify((t) => (timestamp != null ? t.whereRaw(choosePartition(timestamp)) : tx))
        .returning('id')
    : tx('game_rounds')
        .select('id')
        .where({ manufacturerId, externalGameRoundId })
        .orderBy('timestamp', 'asc')
        .modify((t) => (timestamp != null ? t.whereRaw(choosePartition(timestamp)) : tx)));
  if (gameRounds.length > 1)
    logger.warn(`!!! findGameRound found >1 (${gameRounds.length}) rounds`, {
      manufacturerId,
      externalGameRoundId,
      timestamp,
      closeRound,
      gameRounds
    });

  return first(gameRounds)?.id;
};

const findGameRoundWithFallback = async (
  tx: Knex$Transaction<any>,
  manufacturerId: string,
  externalGameRoundId: string,
  closeRound: boolean,
  timestamp: Date,
): Promise<?Id> => {
  const gameRoundId = await findGameRound(
    tx,
    manufacturerId,
    externalGameRoundId,
    closeRound,
    timestamp,
  );
  if (gameRoundId != null) return gameRoundId;
  return await findGameRound(tx, manufacturerId, externalGameRoundId, closeRound);
};


const findOrCreateGameRound = async (
  tx: Knex$Transaction<any>,
  gameId: Id,
  manufacturerId: string,
  manufacturerSessionId: ?Id,
  externalGameRoundId: string,
  closeRound: boolean,
  timestamp: Date,
  retry: boolean = true,
): Promise<Id> => {
  const gameRoundId = await findGameRound(
    tx,
    manufacturerId,
    externalGameRoundId,
    closeRound,
    timestamp,
  );

  if (gameRoundId != null) {
    return gameRoundId;
  }

  const gameRound = await tx
    .transaction(async (tx2) => {
      const [{ id: round }] = await tx2('game_rounds')
        .insert({
          gameId,
          manufacturerSessionId,
          manufacturerId,
          externalGameRoundId,
          timestamp,
          closed: closeRound,
        })
        .returning('id');
      return round;
    })
    .catch(async (err) => {
      logger.warn('findOrCreateGameRound failed', {
        err,
        gameId,
        manufacturerSessionId,
        manufacturerId,
        externalGameRoundId,
        closeRound,
        timestamp,
        retry,
      });
      if (
        retry &&
        err.constraint &&
        err.constraint.match(/_manufacturerId_externalGameRoundId_tim(estamp)?_idx/)
      )
        return findOrCreateGameRound(
          tx,
          gameId,
          manufacturerId,
          manufacturerSessionId,
          externalGameRoundId,
          closeRound,
          timestamp,
          false,
        );
      return err;
    });
  return gameRound;
};

export type GameRoundResultType =
  | 'bet'
  | 'win'
  | 'win_jackpot'
  | 'win_local_jackpot'
  | 'win_freespins'
  | 'cancel_bet'
  | 'cancel_win';

export type GameRoundOperation = {
  transactionId: Id,
  amount?: Money,
  balance: Money,
  bonusBalance: Money,
  type: GameRoundResultType,
};

export type GameRoundResult = {
  currencyId: string,
  transactionId: Id,
  gameRoundId: Id,
  balance: Money,
  bonusBalance: Money,
  type: GameRoundResultType,
  bonusBalanceUsed: boolean,
  existingTransaction?: boolean,
  amount?: Money,
};

export type GameRoundResultWithOperations = {
  ops: GameRoundOperation[],
  ...GameRoundResult
}

export type RawTransaction = {
  amount: Money,
  bonusAmount: Money,
  gameRoundId: Id,
  transactionId: Id,
  type: GameRoundResultType,
  balance: Money,
  bonusBalance: Money,
  currencyId: string,
  bonusBalanceUsed: boolean,
};

const findExistingTransactions = async (
  playerId: Id,
  manufacturerId: string,
  externalTransactionId: string,
  timestamp: Date,
  tx: Knex$Transaction<any>,
): Promise<any[]> => // TODO should be Promise<RawTransaction>
  tx('transactions')
    .select('amount', 'bonusAmount', 'subTransactionId', 'gameRoundId', 'transactions.id as transactionId', 'type', 'transactions.balance', 'transactions.bonusBalance', 'currencyId')
    .innerJoin('players', 'players.id', 'transactions.playerId')
    .where({
      externalTransactionId,
      manufacturerId,
      playerId,
    })
    .whereRaw(choosePartition(timestamp))
    .orderBy('subTransactionId', 'desc');

const findRoundTransactions = async (
  gameRoundId: Id,
  playerId: ?Id,
  tx: Knex$Transaction<any>,
): Promise<(RawTransaction)[]> =>
  tx('transactions')
    .select('amount', 'bonusAmount', 'subTransactionId', 'gameRoundId', 'transactions.id as transactionId', 'externalTransactionId', 'type', 'transactions.balance', 'transactions.bonusBalance', 'currencyId')
    .innerJoin('players', 'players.id', 'transactions.playerId')
    .where({ gameRoundId })
    .modify(qb => (playerId ? qb.where({ playerId }) : qb))
    .orderBy('subTransactionId', 'desc');

const calculateBonusBets = async (bonuses: PlayerBonus[], bonusBalanceToUse: Money): Promise<any[]> => {
  const operations = [];
  const remainingBalance = bonuses.reduce((balance, bonus) => {
    const useFromThisBonus = Math.min(balance, bonus.balance);
    if (useFromThisBonus > 0) {
      operations.push({ bonusAmount: useFromThisBonus, playerBonusId: bonus.id });
    }
    return balance - useFromThisBonus;
  }, bonusBalanceToUse);

  if (remainingBalance > 0) {
    return Promise.reject(walletErrorCodes.BET_FAILED_NO_BALANCE);
  }
  return operations;
};

type processBetResult = {
  defaultConversion: Money,
  betResult: GameRoundResult,
  promotions: CounterUpdateResult[],
  brandId: BrandId,
};

const processBet = async (
  playerId: Id,
  amount: Money,
  sessionId: ?Id,
  gameRoundId: Id,
  manufacturerId: string,
  externalTransactionId: string,
  game: GameWithProfile,
  subTransactionId: Id,
  tx: Knex): Promise<processBetResult> => {
  try {
    const b = await getBalanceWithGameplayForUpdate(tx, playerId);
    if (b == null) {
      return Promise.reject(walletErrorCodes.PLAYER_NOT_FOUND);
    }
    const { brandId, balance, bonusBalance, defaultConversion, currencyId, allowGameplay, accountSuspended } = b;
    if (!allowGameplay || accountSuspended) {
      return Promise.reject(walletErrorCodes.PLAY_BLOCKED);
    }
    const bonuses = await getValidatedActiveBonuses(playerId, bonusBalance, tx);

    const realBalanceToUse = balance > amount ? amount : balance;
    const bonusBalanceToUse = amount - realBalanceToUse;
    const promotions: CounterUpdateResult[] = await updateBetCounters(playerId, sessionId, amount, bonuses.length > 0, currencyId, game, tx);

    let transactionId;
    if (bonuses.length > 0 && bonusBalance > 0) {
      const operations = await calculateBonusBets(bonuses, bonusBalanceToUse);
      if (operations.length > 0) {
        const [{ playerBonusId, bonusAmount }] = operations;
        transactionId = await transactions.bet(playerId, {
          amount: realBalanceToUse,
          bonusAmount,
          playerBonusId,
          gameRoundId,
          manufacturerId,
          externalTransactionId,
          subTransactionId,
        }, tx);
      } else {
        transactionId = await transactions.bet(playerId, {
          amount: realBalanceToUse,
          bonusAmount: 0,
          playerBonusId: null,
          gameRoundId,
          manufacturerId,
          externalTransactionId,
          subTransactionId,
        }, tx);
      }
      if (operations.length > 1) {
        await Promise.all(tail(operations).map(({ playerBonusId: id, bonusAmount: bAmount }, idx) =>
          transactions.bet(playerId, {
            amount: 0,
            bonusAmount: bAmount,
            playerBonusId: id,
            gameRoundId,
            manufacturerId,
            externalTransactionId,
            subTransactionId: subTransactionId + idx + 1,
          }, tx)));
      }
      await processBonusWagerings(playerId, bonuses, game, gameRoundId, amount, tx);
    } else {
      transactionId = await transactions.bet(playerId, {
        amount: realBalanceToUse + bonusBalanceToUse, // Only used when bonus not used, adding bonusBalanceToUse here to make sure invalid bonus states are fixed
        bonusAmount: 0,
        playerBonusId: null,
        gameRoundId,
        manufacturerId,
        externalTransactionId,
        subTransactionId,
      }, tx);
    }

    if (sessionId != null) {
      await updateSessionBet(sessionId, realBalanceToUse, bonusBalanceToUse).transacting(tx);
    }

    const betResult: GameRoundResult = {
      currencyId,
      gameRoundId,
      transactionId,
      balance: balance - realBalanceToUse,
      bonusBalance: bonusBalance - bonusBalanceToUse,
      bonusBalanceUsed: bonusBalanceToUse > 0,
      type: 'bet',
    };

    return {
      promotions,
      defaultConversion,
      brandId,
      betResult,
    };
  } catch (e) {
    if (e.constraint === 'players_bonusBalance_check' || e.constraint === 'players_balance_check')
      return Promise.reject(walletErrorCodes.BET_FAILED_NO_BALANCE);
    logger.warn('processBet failed', { playerId, amount, sessionId, gameRoundId, manufacturerId, externalTransactionId, game, subTransactionId }, e);
    throw e;
  }
};

const processWin = async (
  playerId: Id,
  type: 'win' | 'win_jackpot' | 'win_local_jackpot' | 'win_freespins',
  sessionId: ?Id,
  manufacturerId: string,
  externalTransactionId: string,
  gameRoundId: Id,
  amount: Money,
  subTransactionId: Id,
  timestamp: Date,
  game: GameWithProfile,
  tx: Knex$Transaction<any>): Promise<{ defaultConversion: Money, winResult: GameRoundResult, brandId: BrandId }> => {
  const [{ brandId, balance, bonusBalance, currencyId, defaultConversion }, { realBets, bonusBets }] = await Promise.all([
    getBalanceWithGameplayForUpdate(tx, playerId),
    betsForGameRound(gameRoundId, timestamp, tx),
  ]);
  const totalBets = bonusBets + realBets;
  const winRatio = totalBets > 0 ? Math.round(amount / totalBets * 100) : 0;
  const bonusWin = bonusBalance > 0 ? amount : (totalBets > 0 ? (bonusBets / totalBets) : 0) * amount;
  const realWin = amount - bonusWin;
  await updateLimitWithWin(playerId, amount, winRatio, game, tx);

  let playerBonusId: ?Id = null;
  if (bonusBets > 0 || bonusWin > 0) {
    playerBonusId = await processBonusWin(playerId, gameRoundId, amount, bonusWin, bonusBets, totalBets, tx);
    if (playerBonusId == null) {
      logger.warn('Bonus not found, crediting bonus win as real money', { playerBonusId, gameRoundId, bonusBets, bonusWin, playerId });
      const transactionId = await transactions.win(playerId, {
        type,
        amount: realWin + bonusWin,
        bonusAmount: 0,
        playerBonusId: null,
        gameRoundId,
        manufacturerId,
        externalTransactionId,
        subTransactionId,
      }, tx);
      if (sessionId != null) {
        await updateSessionWin(sessionId, realWin, bonusWin).transacting(tx);
      }
      return {
        brandId,
        defaultConversion,
        winResult: {
          currencyId,
          transactionId,
          gameRoundId,
          balance: balance + realWin + bonusWin,
          bonusBalance,
          bonusBalanceUsed: bonusBets > 0,
          type,
        },
      };
    }
  }
  const transactionId = await transactions.win(playerId, { type, amount: realWin, bonusAmount: bonusWin, playerBonusId, gameRoundId, manufacturerId, externalTransactionId, subTransactionId }, tx);
  if (sessionId != null) {
    await updateSessionWin(sessionId, realWin, bonusWin).transacting(tx);
  }
  return {
    brandId,
    defaultConversion,
    winResult: {
      currencyId,
      transactionId,
      gameRoundId,
      balance: balance + realWin,
      bonusBalance: bonusBalance + bonusWin,
      bonusBalanceUsed: bonusBets > 0,
      type,
    },
  };
};

export type Win = {
  type: 'win' | 'win_jackpot' | 'win_local_jackpot' | 'win_freespins',
  amount: Money,
  transactionId?: string,
};

const mapOperations = (result: GameRoundResult): GameRoundOperation => ({
  transactionId: result.transactionId,
  amount: result.amount,
  balance: result.balance,
  bonusBalance: result.bonusBalance,
  type: result.type,
});

const returnResults = (
  results: GameRoundResult[],
  existingTransaction?: boolean,
): GameRoundResultWithOperations => ({
  currencyId: first(results).currencyId,
  transactionId: first(results).transactionId,
  gameRoundId: first(results).gameRoundId,
  balance: last(results).balance,
  bonusBalance: last(results).bonusBalance,
  bonusBalanceUsed: any<GameRoundResult>('bonusBalanceUsed')(results),
  type: first(results).type,
  ops: results.map(mapOperations),
  existingTransaction,
});

const processWins = async (
  playerId: Id,
  sessionId: ?Id,
  manufacturerId: string,
  externalTransactionId: string,
  gameRoundId: Id,
  timestamp: Date,
  wins: Win[],
  subTransactionId: number,
  game: GameWithProfile,
  tx: Knex$Transaction<any>,
) => {
  const results = [];
  let brandId;
  let defaultConversion;
  for (const [idx, win] of wins.entries()) {
    const b = await processWin(
      playerId,
      win.type,
      sessionId,
      manufacturerId,
      externalTransactionId,
      gameRoundId,
      win.amount,
      subTransactionId + idx,
      timestamp,
      game,
      tx,
    );
    brandId = b.brandId;
    defaultConversion = b.defaultConversion;
    results.push(b.winResult);
  }
  return {
    brandId,
    defaultConversion,
    result: returnResults(results),
  };
};

export type CreditWin = {
  manufacturerId: string,
  game: GameWithProfile,
  currencyId?: string,
  sessionId: ?Id,
  manufacturerSessionId: ?Id,
  externalGameRoundId: string,
  externalTransactionId: string,
  closeRound: boolean,
  timestamp: Date,
  createGameRound?: boolean,
};
const creditWin = (playerId: Id, {
  manufacturerId,
  game,
  sessionId,
  manufacturerSessionId,
  externalGameRoundId,
  externalTransactionId,
  closeRound,
  timestamp,
  currencyId: expectedCurrencyId,
  createGameRound,
}: CreditWin, wins: Win[]): Promise<GameRoundResult> =>
  pg.transaction(async (tx) => {
    let gameRoundId: ?Id = null;
    if (createGameRound == null || createGameRound === true) {
      gameRoundId = await findOrCreateGameRound(
        tx,
        game.id,
        manufacturerId,
        manufacturerSessionId,
        externalGameRoundId,
        closeRound,
        timestamp,
      );
    } else {
      gameRoundId = await findGameRoundWithFallback(
        tx,
        manufacturerId,
        externalGameRoundId,
        closeRound,
        timestamp,
      );
    }
    if (gameRoundId == null) {
      throw new Error(`Game round was not found ${manufacturerId} ${externalGameRoundId}`);
    }

    const existingTransactions = await findExistingTransactions(playerId, manufacturerId, externalTransactionId, timestamp, tx);
    if (existingTransactions.length > 0) {
      return returnResults(existingTransactions, true);
    }

    const { brandId, result, defaultConversion } = await processWins(playerId, sessionId, manufacturerId, externalTransactionId, gameRoundId, timestamp, wins, 0, game, tx);
    await Optimove.notifyPlayerWin(
      {
        gameRoundId,
        timestamp,
        gameId: game.id,
        playerId,
        brandId,
        winResult: result
      },
      tx,
    );
    if (expectedCurrencyId != null && result.currencyId !== expectedCurrencyId) {
      return Promise.reject(walletErrorCodes.INVALID_CURRENCY);
    }
    if (brandId && defaultConversion) {
      const promotions = await getActivePromotions(tx, playerId);
      await wagerWin(playerId, brandId, defaultConversion, game, wins.map(({ amount }) => amount).reduce((a, b) => a + b, 0), promotions);
    }
    return result;
  });

export type PlaceBetAndCreditWin = {
  manufacturerId: string,
  game: GameWithProfile,
  sessionId: ?Id,
  amount: Money,
  currencyId?: string,
  manufacturerSessionId: ?Id,
  externalGameRoundId: string,
  externalTransactionId: string,
  closeRound: boolean,
  timestamp: Date,
};
const placeBet = (playerId: Id, {
  manufacturerId,
  game,
  sessionId,
  amount,
  manufacturerSessionId,
  externalGameRoundId,
  externalTransactionId,
  closeRound,
  timestamp,
  currencyId: expectedCurrencyId,
}: PlaceBetAndCreditWin, wins: Win[]): Promise<GameRoundResultWithOperations> =>
  pg.transaction(async (tx) => {
    const gameRoundId = await findOrCreateGameRound(
      tx,
      game.id,
      manufacturerId,
      manufacturerSessionId,
      externalGameRoundId,
      closeRound,
      timestamp,
    );
    const existingTransactions = await findExistingTransactions(
      playerId,
      manufacturerId,
      externalTransactionId,
      timestamp,
      tx,
    );
    if (existingTransactions.length > 0) return returnResults(existingTransactions, true);

    const { betResult, brandId, promotions, defaultConversion } = await processBet(
      playerId,
      amount,
      sessionId,
      gameRoundId,
      manufacturerId,
      externalTransactionId,
      game,
      0,
      tx,
    );

    await Optimove.notifyPlayerBet(
      {
        gameRoundId,
        timestamp,
        gameId: game.id,
        playerId,
        brandId,
        betResult
      },
      tx,
    );

    if (expectedCurrencyId != null && betResult.currencyId !== expectedCurrencyId)
      return Promise.reject(walletErrorCodes.INVALID_CURRENCY);

    if (wins.length === 0) {
      await wagerBet(playerId, brandId, defaultConversion, game, amount, 0, promotions);
      return returnResults([betResult]);
    }

    const { result: winResult } = await processWins(
      playerId,
      sessionId,
      manufacturerId,
      externalTransactionId,
      gameRoundId,
      timestamp,
      wins,
      100,
      game,
      tx,
    );
    await Optimove.notifyPlayerWin(
      {
        gameRoundId,
        timestamp,
        gameId: game.id,
        playerId,
        brandId,
        winResult
      },
      tx,
    );

    await wagerBet(
      playerId,
      brandId,
      defaultConversion,
      game,
      amount,
      wins.map((x) => x.amount).reduce((a, b) => a + b, 0),
      promotions,
    );
    // $FlowFixMe[prop-missing] - winResult already has ops property
    return returnResults([betResult, winResult]);
  });

export type CloseRound = {
  manufacturerId: string,
  currencyId?: string,
  externalGameRoundId: string,
  timestamp: Date,
};

const closeRound = (playerId: Id, {
  manufacturerId,
  externalGameRoundId,
  timestamp,
}: CloseRound): Promise<{ currencyId: string, gameRoundId: ?Id, balance: Money, bonusBalance: Money}> =>
  pg.transaction(async (tx) => {
    const gameRoundId = await findGameRound(
      tx,
      manufacturerId,
      externalGameRoundId,
      true,
      timestamp,
    );
    const { balance, bonusBalance, currencyId } = await getBalance(playerId);
    return {
      currencyId,
      balance,
      bonusBalance,
      gameRoundId,
    };
  });

export type CancelTransaction = {
  manufacturerId: string,
  externalTransactionId: string,
  externalCancelTransactionId?: string,
  externalGameRoundId?: string,
  timestamp: Date,
  amount?: Money,
  currencyId?: string,
};

const findExternalGameRound = (manufacturerId: string, externalGameRoundId: string, timestamp: Date) =>
  pg('game_rounds')
    .first('id')
    .where({ manufacturerId, externalGameRoundId })
    .whereRaw(choosePartition(timestamp));

const cancelTransaction = (playerId: Id, cancel: CancelTransaction): Promise<{ transactionIds: Id[], transactionFound: boolean, alreadyCancelled: boolean, invalidTransaction: boolean }> =>
  pg.transaction(async (tx) => {
    const { manufacturerId, externalTransactionId, timestamp } = cancel;
    const rawTransactions = await findExistingTransactions(playerId, manufacturerId, externalTransactionId, timestamp, tx);
    const matches = cancel.externalGameRoundId != null ? await findExternalGameRound(manufacturerId, cancel.externalGameRoundId, timestamp).transacting(tx) : null;
    const existingTransactions = await rawTransactions
      .filter(({ amount, bonusAmount }) => cancel.amount == null || cancel.amount === amount + bonusAmount)
      .filter(({ gameRoundId }) => {
        if (cancel.externalGameRoundId != null) {
          return matches != null && matches.id === gameRoundId;
        }
        return true;
      });
    if (cancel.currencyId != null && existingTransactions[0] && existingTransactions[0].currencyId !== cancel.currencyId) {
      return Promise.reject(walletErrorCodes.INVALID_CURRENCY);
    }
    const toCompensate = existingTransactions.filter(({ type }) => type !== 'cancel_bet' && type !== 'cancel_win');
    const invalidTransaction = rawTransactions.length > existingTransactions.length;
    if (existingTransactions.length > toCompensate.length || invalidTransaction) {
      const transactionIds = existingTransactions.filter(({ type }) => type === 'cancel_bet' || type === 'cancel_win').map(({ transactionId }) => transactionId);
      return { transactionIds, transactionFound: existingTransactions.length > 0, alreadyCancelled: true, invalidTransaction };
    }
    const transactionIds: any = await Promise.all(toCompensate.map(({ transactionId }) => transactions.cancelTransaction(transactionId, cancel.externalCancelTransactionId, tx)));
    return { transactionIds, transactionFound: toCompensate.length > 0, alreadyCancelled: false, invalidTransaction };
  });

export type GetTransaction = {
  manufacturerId: string,
  externalTransactionId: string,
  externalGameRoundId?: string,
  timestamp: Date,
  amount?: Money,
};

const getTransaction = (playerId: Id, get: GetTransaction): Promise<RawTransaction[]> =>
  pg.transaction(async (tx) => {
    const { manufacturerId, externalTransactionId, timestamp } = get;
    const rawTransactions = await findExistingTransactions(playerId, manufacturerId, externalTransactionId, timestamp, tx);
    const matches = get.externalGameRoundId != null ? await findExternalGameRound(manufacturerId, get.externalGameRoundId, timestamp).transacting(tx) : null;
    const existingTransactions = await rawTransactions
      .filter(({ amount, bonusAmount }) => get.amount == null || get.amount === amount + bonusAmount)
      .filter(({ gameRoundId }) => {
        if (get.externalGameRoundId != null) {
          return matches != null && matches.id === gameRoundId;
        }
        return true;
      });
    return existingTransactions;
  });

export type GetRoundTransactions = {
  manufacturerId: string,
  externalGameRoundId: string,
  timestamp: Date,
};

const getRoundTransactions = (playerId: Id, request: GetRoundTransactions): Promise<RawTransaction[]> =>
  pg.transaction(async (tx) => {
    const { manufacturerId, externalGameRoundId, timestamp } = request;
    const round = await findExternalGameRound(manufacturerId, externalGameRoundId, timestamp).transacting(tx);
    if (!round) return [];
    const roundTransactions = await findRoundTransactions(round.id, playerId, tx);

    return roundTransactions;
  });

const refund = (roundId: Id): any =>
  pg.transaction(async (tx) => {
    const existingTransactions = await findRoundTransactions(roundId, null, tx);
    const toCompensate = existingTransactions.filter(({ type }) => type !== 'cancel_bet' && type !== 'cancel_win');
    if (existingTransactions.length !== toCompensate.length) {
      return {};
    }
    return await Promise.all(toCompensate.map(({ transactionId }) => transactions.cancelTransaction(transactionId, null, tx)));
  });

const close = (roundId: Id): any =>
  pg('game_rounds')
    .update({ closed: true })
    .where({ id: roundId })
    .returning('*')
    .then(([round]) => round);

module.exports = { placeBet, creditWin, cancelTransaction, close, refund, closeRound, getTransaction, getRoundTransactions };
