/* @flow */
import type { ManufacturerSession } from '../sessions/ManufacturerSession';
import type { Win } from "./GameRound";

const Boom = require('@hapi/boom');
const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const walletErrorCodes = require('gstech-core/modules/errors/wallet-error-codes');
const slack = require('gstech-core/modules/slack');
const { creditWin, placeBet, cancelTransaction, closeRound, getTransaction, getRoundTransactions } = require('./GameRound');
const Game = require('../games');
const { findManufacturerSession, getManufacturerSessionsForPlayer } = require('../sessions');
const { pingPlayerSession } = require('../sessions/Session');
const settings = require('../bonuses/settings');
const Player = require('../players');
const { formatMoney } = require('../core/money');
const {
  processWinSchema,
  betAndWinSchema,
  getTransactionSchema,
  cancelTransactionSchema,
  closeRoundSchema,
  getRoundTransactionsSchema,
} = require('./schemas');

// export type WinType = 'win' | 'jackpot' | 'pooled_jackpot' | 'freespins';
// export type Win = {
//   type: WinType,
//   amount: Money,
//   transactionId: string,
// };

const findSession = async (playerId: Id, { manufacturer, sessionId }: { manufacturer: string, sessionId: ?string }): Promise<?ManufacturerSession> => {
  if (sessionId != null) {
    const session = await findManufacturerSession(manufacturer, sessionId);
    if (session == null) {
      logger.warn(`Session not active ${manufacturer}:${sessionId}`);
      throw new Error({ error: walletErrorCodes.SESSION_NOT_ACTIVE });
    }
    return session;
  }
  return await getManufacturerSessionsForPlayer(manufacturer, playerId);
};

const mapType = (type: string) => {
  if (type === 'jackpot') {
    return 'win_local_jackpot';
  }
  if (type === 'pooled_jackpot') {
    return 'win_jackpot';
  }
  if (type === 'freespins') {
    return 'win_freespins';
  }
  return 'win';
};

const reverseMapType = (type: string): string => {
  if (type === 'win_local_jackpot') {
    return 'jackpot';
  }
  if (type === 'win_jackpot') {
    return 'pooled_jackpot';
  }
  if (type === 'win_freespins') {
    return 'freespins';
  }
  return type;
};

const mapWins = (wins: Win[], defaultTransactionId: string): $NonMaybeType<Win[]> => wins.map(win => ({
  type: mapType(win.type),
  amount: win.amount,
  transactionId: win.transactionId || defaultTransactionId,
}));

const reportWin = async (playerId: Id, game: string, balance: Money, currencyId: string, wins: Win[]) => {
  for (const win of wins) {
    // $FlowFixMe[invalid-computed-prop]
    if (win.amount / settings[currencyId].baseCurrencyMultiplier >= settings.bigwin) {
      const player = await Player.getPlayerById(playerId);
      await slack.logBigWinMessage('Idefix', 'BigWin', { game, username: player.username, win: formatMoney(win.amount, currencyId), balance: formatMoney(balance, currencyId) });
    }
  }
};

const processWinHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    // logger.debug('>>> processWinHandler', req.body );
    const win = await validate(req.body, processWinSchema, 'Win validation failed');

    const game = win.useGameId
      ? await Game.getByGameIdWithProfile(win.brandId, win.manufacturer, win.game) : await Game.getWithProfile(win.brandId, win.manufacturer, win.game);
    if (game == null) {
      logger.warn(`Game not found ${win.game}`, req.body);
      return next(Boom.notFound(walletErrorCodes.GAME_NOT_FOUND.message, walletErrorCodes.GAME_NOT_FOUND));
    }

    const playerId = Number(req.params.playerId);

    const session = await findSession(playerId, win);
    pingPlayerSession(win.brandId, playerId);

    const wins = mapWins(win.wins, win.transactionId);
    const { gameRoundId, transactionId, currencyId, balance, bonusBalance, existingTransaction } = await creditWin(playerId, {
      manufacturerId: win.manufacturer,
      game,
      sessionId: session != null ? session.sessionId : null,
      manufacturerSessionId: session != null ? session.id : null,
      closeRound: win.closeRound,
      externalGameRoundId: win.gameRoundId,
      externalTransactionId: win.transactionId,
      timestamp: win.timestamp,
      currencyId: win.currencyId,
      createGameRound: win.createGameRound,
    }, wins);

    reportWin(playerId, game.name, balance + bonusBalance, currencyId, win.wins);

    return res.json({
      gameRoundId,
      transactionId,
      currencyId,
      balance: balance + bonusBalance,
      realBalance: balance,
      bonusBalance,
      existingTransaction,
    });
  } catch (e) {
    if (e.code != null) {
      logger.warn('creditWin failed', e, req.params, req.body);
      return next(Boom.badRequest(e.message, { code: e.code }));
    }

    logger.error('creditWin failed', e, req.params, req.body);
    return next(Boom.badRequest(e.message, walletErrorCodes.WIN_FAILED));
  }
};

const placeBetHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction
): Promise<mixed | express$Response> => {
  try {
    // logger.debug('>>> placeBetHandler', req.body );
    const bet = await validate(req.body, betAndWinSchema, 'bet/win validation failed');
    const game = bet.useGameId
      ? await Game.getByGameIdWithProfile(bet.brandId, bet.manufacturer, bet.game)
      : await Game.getWithProfile(bet.brandId, bet.manufacturer, bet.game);
    if (game == null) {
      logger.warn(`Game not found ${bet.game}`, req.body);
      return next(
        Boom.notFound(walletErrorCodes.GAME_NOT_FOUND.message, walletErrorCodes.GAME_NOT_FOUND),
      );
    }

    const playerId = Number(req.params.playerId);
    const session = await findSession(playerId, bet);
    pingPlayerSession(bet.brandId, playerId);
    const { amount } = bet;

    const betOp = {
      manufacturerId: bet.manufacturer,
      game,
      sessionId: session != null ? session.sessionId : null,
      manufacturerSessionId: session != null ? session.id : null,
      amount,
      closeRound: bet.closeRound,
      externalGameRoundId: bet.gameRoundId,
      externalTransactionId: bet.transactionId,
      timestamp: bet.timestamp,
      currencyId: bet.currencyId,
    };
    const {
      gameRoundId,
      transactionId,
      currencyId,
      balance,
      bonusBalance,
      bonusBalanceUsed,
      ops,
      existingTransaction,
    } = await placeBet(playerId, betOp, mapWins(bet.wins, bet.transactionId));

    reportWin(playerId, game.name, balance + bonusBalance, currencyId, bet.wins);
    return res.json({
      gameRoundId,
      transactionId,
      currencyId,
      balance: balance + bonusBalance,
      realBalance: balance,
      bonusBalance,
      bonusBalanceUsed,
      ops:
        ops &&
        ops.map((x) => ({
          transactionId: x.transactionId,
          amount: x.amount,
          balance: x.balance + x.bonusBalance,
          realBalance: x.balance,
          bonusBalance: x.bonusBalance,
          type: reverseMapType(x.type),
        })),
      existingTransaction,
    });
  } catch (e) {
    if (e.code != null) {
      logger.warn('processBet failed', e, req.params, req.body);
      return next(Boom.badRequest(e.message, { code: e.code }));
    }

    logger.error('processBet failed', e, req.params, req.body);
    return next(Boom.badRequest(e.message, walletErrorCodes.BET_FAILED));
  }
};

const getTransactionHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const get = await validate(req.query, getTransactionSchema, 'Get transaction validation failed');
    const playerId = Number(req.params.playerId);

    const transactions = await getTransaction(playerId, {
      manufacturerId: get.manufacturer,
      externalTransactionId: get.transactionId,
      timestamp: get.timestamp,
      externalGameRoundId: get.gameRoundId,
    });
    return res.json(transactions);
  } catch (e) {
    if (e.code != null) {
      logger.warn('getTransaction failed', e);
      return next(Boom.badRequest(e.message, { code: e.code }));
    }

    logger.error('getTransaction failed', e);
    return next(Boom.badRequest(e.message, walletErrorCodes.CANCEL_FAILED));
  }
};

const cancelTransactionHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const cancel = await validate(req.body, cancelTransactionSchema, 'Cancel transaction validation failed');
    const playerId = Number(req.params.playerId);

    const { transactionIds, transactionFound, alreadyCancelled, invalidTransaction } = await cancelTransaction(playerId, {
      manufacturerId: cancel.manufacturer,
      externalTransactionId: cancel.transactionId,
      externalCancelTransactionId: cancel.cancelTransactionId,
      timestamp: cancel.timestamp,
      externalGameRoundId: cancel.gameRoundId,
      amount: cancel.amount,
      currencyId: cancel.currencyId,
    });
    return res.json({ transactionIds, transactionFound, alreadyCancelled, invalidTransaction });
  } catch (e) {
    if (e.code != null) {
      logger.warn('cancelTransaction failed', req.body, req.params, e);
      return next(Boom.badRequest(e.message, { code: e.code }));
    }

    logger.error('cancelTransaction failed', req.body, req.params, e);
    return next(Boom.badRequest(e.message, walletErrorCodes.CANCEL_FAILED));
  }
};

const closeRoundHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const round = await validate(req.body, closeRoundSchema, 'close round validation failed');
    const playerId = Number(req.params.playerId);
    pingPlayerSession(round.brandId, playerId);
    const { gameRoundId, currencyId, balance, bonusBalance } = await closeRound(playerId, {
      manufacturerId: round.manufacturer,
      externalGameRoundId: round.gameRoundId,
      timestamp: round.timestamp,
    });

    return res.json({
      gameRoundId,
      currencyId,
      balance: balance + bonusBalance,
      realBalance: balance,
      bonusBalance,
    });
  } catch (e) {
    if (e.code != null) {
      logger.warn('closeRound failed', e, req.params, req.body);
      return next(Boom.badRequest(e.message, { code: e.code }));
    }

    logger.error('closeRound failed', e, req.params, req.body);
    return next(Boom.badRequest(e.message, walletErrorCodes.BET_FAILED));
  }
};

const getRoundTransactionsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const get = await validate(req.query, getRoundTransactionsSchema, 'Get round transactions validation failed');
    const playerId = Number(req.params.playerId);

    const transactions = await getRoundTransactions(playerId, {
      manufacturerId: get.manufacturer,
      timestamp: get.timestamp,
      externalGameRoundId: get.gameRoundId,
    });

    return res.json(transactions);
  } catch (e) {
    if (e.code != null) {
      logger.warn('getRoundTransactions failed', e);
      return next(Boom.badRequest(e.message, { code: e.code }));
    }

    logger.error('getRoundTransactions failed', e);
    return next(Boom.badRequest(e.message, walletErrorCodes.CANCEL_FAILED));
  }
};

module.exports = {
  placeBetHandler,
  processWinHandler,
  cancelTransactionHandler,
  closeRoundHandler,
  getTransactionHandler,
  getRoundTransactionsHandler,
};
