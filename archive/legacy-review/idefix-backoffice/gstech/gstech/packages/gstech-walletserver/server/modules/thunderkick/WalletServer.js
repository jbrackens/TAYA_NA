/* @flow */
import type { BalanceResult, Win, GameRoundOp } from 'gstech-core/modules/clients/backend-wallet-api';
import type {
  ThunderkickMoney,
  Account,
  ThunderkickRequest,
  BalancesRequest,
  BalancesResponse,
  BetAndWinRequest,
  BetRequest,
  WinRequest,
  RollbackBetAndWinRequest,
  RollbackBetRequest,
  FreeRoundsResultRequest,
} from './types';


const basicAuth = require('express-basic-auth');

const { Router } = require('express');
const find = require('lodash/find');
const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const { errors: backendErrors } = require('gstech-core/modules/clients/backend-wallet-api');
const { errors } = require('./types');
const config = require('../../../config');
const { MANUFACTURER_ID } = require('./constants');

const configuration = config.providers.thunderkick;
const router: express$Router<> = Router();  

const authorize = (username: string, password: any) => configuration.user === username && configuration.pass === password;

router.use((req: express$Request, res: express$Response, next: express$NextFunction) => {
  logger.debug('Thunderkick req', JSON.stringify(req.body));
  next();
});

router.use(basicAuth({ authorizer: authorize }));

const formatMoney = (amount: Money): ThunderkickMoney => (amount / 100).toFixed(6);
const parseMoney = (amount: ThunderkickMoney): Money => Number(amount) * 100;
const thunderkickError = (error: Object): Error => (new Error(`${error.httpcode}_${error.code}_${error.message}`));
const handleBackendError = (error: any, tkerror: Object, beerror: Object) => {
  if (error.code && error.code === beerror.code) {
    throw thunderkickError(tkerror);
  }
};
const getPlayerId = async (request: ThunderkickRequest) => {
  const tokens = request.playerExternalReference.split('_');
  if (tokens.length !== 2) {
    throw thunderkickError(errors.INVALID_ACCOUNT);
  }

  const [brandId, playerId] = tokens;
  return { brandId, playerId: Number(playerId) };
};
const formatAccount = (sum: number, currency: string, accountId: string, accountType: string): Account => {
  const account = {
    balance: {
      amount: formatMoney(sum),
      currency,
    },
    accountId,
    accountType,
  };

  return account;
};

const formatBalances = (balanceResult: BalanceResult, playerId: number): BalancesResponse => {
  const { realBalance, bonusBalance, currencyId } = balanceResult;
  return {
    moneyAccounts: [
      formatAccount(realBalance, currencyId, `${playerId}_11`, 'REAL'),
      formatAccount(bonusBalance, currencyId, `${playerId}_12`, 'BONUS'),
    ],
  };
};

const handleError = async (error: Error, req: express$Request, res: express$Response) => {
  logger.warn('Thunderkick error', error);

  const err = error.message.split('_');
  if (err.length !== 3) {
    res.status(500);
    return res.json({ errorCode: errors.INTERNAL_SERVER_ERROR.code, errorMessage: errors.INTERNAL_SERVER_ERROR.message });
  }

  const [httpcode, code, message] = err;
  res.status(Number(httpcode));

  try {
    const body: ThunderkickRequest = (req.body: any);
    const { playerId } = await getPlayerId(body);
    const balance = await api.getBalance(playerId);
    const balances = formatBalances(balance, playerId);

    return res.json({ errorCode: code, errorMessage: message, balances });
  } catch (e) {
    logger.warn('Thunderkick error', e);
    return res.json({ errorCode: code, errorMessage: message });
  }
};

router.post('/balances/', async (req: express$Request, res: express$Response) => {
  try {
    const body: BalancesRequest = (req.body: any);
    const { playerId } = await getPlayerId(body);

    try {
      const balance = await api.getBalance(playerId);
      const result = formatBalances(balance, playerId);

      return res.json(result);
    } catch (e) {
      handleBackendError(e, errors.INVALID_PLAYER_SESSION, backendErrors.SESSION_NOT_ACTIVE);
      handleBackendError(e, errors.INVALID_GAME_SESSION, backendErrors.GAME_NOT_FOUND);
      handleBackendError(e, errors.INVALID_ACCOUNT, backendErrors.PLAYER_NOT_FOUND);

      throw e;
    }
  } catch (e) {
    return handleError(e, req, res);
  }
});

router.post('/betandwin/:betTransactionId', async (req: express$Request, res: express$Response) => {
  try {
    const body: BetAndWinRequest = (req.body: any);
    const { brandId, playerId } = await getPlayerId(body);
    const { gameRound, bets, betTime, wins, winTransactionId, operatorSessionToken } = body;

    const betamount = bets
      .filter(x => x.accountType === 'REAL')
      .map(item => parseMoney(item.bet.amount))
      .reduce((a, b) => a + b, 0);

    const betRequest = {
      brandId,
      manufacturer: MANUFACTURER_ID,
      closeRound: true,
      amount: betamount,
      game: gameRound.gameName,
      gameRoundId: String(gameRound.gameRoundId),
      transactionId: req.params.betTransactionId,
      timestamp: new Date(betTime),
      wins: (wins.map(item => ({
        amount: parseMoney(item.win.amount),
        type: item.accountType === 'FREE_ROUND' ? 'freespins' : 'win',
        transactionId: `${winTransactionId}`,
      })): Win[]),
      sessionId: operatorSessionToken,
    };

    try {
      const betResult = await api.bet(playerId, betRequest);
      const betTransaction = find(betResult.ops, (x: GameRoundOp) => x.type === 'win' || x.type === 'freespins');
      return res.json({
        balances: formatBalances(betResult, playerId),
        extBetTransactionId: String(betResult.transactionId),
        extWinTransactionId: betTransaction ? String(betTransaction.transactionId) : '',
      });
    } catch (e) {
      handleBackendError(e, errors.INVALID_PLAYER_SESSION, backendErrors.SESSION_NOT_ACTIVE);
      handleBackendError(e, errors.INVALID_GAME_SESSION, backendErrors.GAME_NOT_FOUND);
      handleBackendError(e, errors.INVALID_ACCOUNT, backendErrors.PLAYER_NOT_FOUND);

      handleBackendError(e, errors.NOT_ENOUGH_MONEY, backendErrors.BET_FAILED_NO_BALANCE);
      handleBackendError(e, errors.PLAYER_SPENDING_LIMIT_REACHED, backendErrors.PLAY_LIMIT_REACHED);
      handleBackendError(e, errors.PLAYER_SPENDING_LIMIT_REACHED, backendErrors.PLAY_BLOCKED);
      handleBackendError(e, errors.INVALID_BETANDWIN_TRANSACTION, backendErrors.BET_FAILED);
      handleBackendError(e, errors.INVALID_BETANDWIN_TRANSACTION, backendErrors.WIN_FAILED);

      throw e;
    }
  } catch (e) {
    return handleError(e, req, res);
  }
});

router.post('/bet/:betTransactionId', async (req: express$Request, res: express$Response) => {
  try {
    const body: BetRequest = (req.body: any);
    const { brandId, playerId } = await getPlayerId(body);
    const { gameRound, bets, betTime, operatorSessionToken } = body;
    const amount = bets
      .filter(x => x.accountType === 'REAL')
      .map(item => parseMoney(item.bet.amount))
      .reduce((a, b) => a + b, 0);

    const betRequest = {
      brandId,
      manufacturer: MANUFACTURER_ID,
      closeRound: false,
      amount,
      game: gameRound.gameName,
      gameRoundId: String(gameRound.gameRoundId),
      transactionId: req.params.betTransactionId,
      timestamp: new Date(betTime),
      wins: undefined,
      sessionId: operatorSessionToken,
    };

    try {
      const betResult = await api.bet(playerId, betRequest);

      return res.json({
        balances: formatBalances(betResult, playerId),
        extBetTransactionId: String(betResult.transactionId),
      });
    } catch (e) {
      handleBackendError(e, errors.INVALID_PLAYER_SESSION, backendErrors.SESSION_NOT_ACTIVE);
      handleBackendError(e, errors.INVALID_GAME_SESSION, backendErrors.GAME_NOT_FOUND);
      handleBackendError(e, errors.INVALID_ACCOUNT, backendErrors.PLAYER_NOT_FOUND);

      handleBackendError(e, errors.NOT_ENOUGH_MONEY, backendErrors.BET_FAILED_NO_BALANCE);
      handleBackendError(e, errors.PLAYER_SPENDING_LIMIT_REACHED, backendErrors.PLAY_LIMIT_REACHED);
      handleBackendError(e, errors.PLAYER_SPENDING_LIMIT_REACHED, backendErrors.PLAY_BLOCKED);
      handleBackendError(e, errors.INVALID_BET_TRANSACTION, backendErrors.BET_FAILED);

      throw e;
    }
  } catch (e) {
    return handleError(e, req, res);
  }
});

router.post('/win/:winTransactionId', async (req: express$Request, res: express$Response) => {
  try {
    const body: WinRequest = (req.body: any);
    const { brandId, playerId } = await getPlayerId(body);
    const { gameRound, wins, winTime, operatorSessionToken } = body;

    const winRequest = {
      brandId,
      wins: wins.map(item => ({
        amount: parseMoney(item.win.amount),
        type: item.accountType === 'FREE_ROUND' ? 'freespins' : 'win',
      })),
      manufacturer: MANUFACTURER_ID,
      game: gameRound.gameName,
      createGameRound: false,
      closeRound: true,
      gameRoundId: String(gameRound.gameRoundId),
      transactionId: req.params.winTransactionId,
      timestamp: new Date(winTime),
      sessionId: operatorSessionToken,
    };

    try {
      const winResult = await api.win(playerId, winRequest);

      return res.json({
        balances: formatBalances(winResult, playerId),
        extWinTransactionId: String(winResult.transactionId),
      });
    } catch (e) {
      handleBackendError(e, errors.INVALID_PLAYER_SESSION, backendErrors.SESSION_NOT_ACTIVE);
      handleBackendError(e, errors.INVALID_GAME_SESSION, backendErrors.GAME_NOT_FOUND);
      handleBackendError(e, errors.INVALID_ACCOUNT, backendErrors.PLAYER_NOT_FOUND);

      handleBackendError(e, errors.INVALID_WIN_TRANSACTION, backendErrors.WIN_FAILED);

      throw e;
    }
  } catch (e) {
    return handleError(e, req, res);
  }
});

router.post('/rollbackbetandwin/:rollbackTransactionId', async (req: express$Request, res: express$Response) => {
  try {
    const body: RollbackBetAndWinRequest = (req.body: any);
    const { brandId, playerId } = await getPlayerId(body);
    const { gameRoundId, betAmount, betTransactionId } = body;

    const cancelRequest = {
      brandId,
      manufacturer: MANUFACTURER_ID,
      transactionId: String(betTransactionId),
      gameRoundId: String(gameRoundId),
      amount: parseMoney(betAmount.amount),
      timestamp: new Date(),
    };

    try {
      const cancelResult = await api.cancelTransaction(playerId, cancelRequest);
      const balance = await api.getBalance(playerId);

      return res.json({
        balances: formatBalances(balance, playerId),
        extRollbackTransactionId: cancelResult.transactionFound ? String(cancelResult.transactionIds[0]) : '',
      });
    } catch (e) {
      handleBackendError(e, errors.INVALID_PLAYER_SESSION, backendErrors.SESSION_NOT_ACTIVE);
      handleBackendError(e, errors.INVALID_GAME_SESSION, backendErrors.GAME_NOT_FOUND);
      handleBackendError(e, errors.INVALID_ACCOUNT, backendErrors.PLAYER_NOT_FOUND);

      handleBackendError(e, errors.ROLLBACK_BETANDWIN_TRANSACTION, backendErrors.CANCEL_FAILED);

      throw e;
    }
  } catch (e) {
    return handleError(e, req, res);
  }
});

router.post('/rollbackbet/:rollbackTransactionId', async (req: express$Request, res: express$Response) => {
  try {
    const body: RollbackBetRequest = (req.body: any);
    const { brandId, playerId } = await getPlayerId(body);
    const { gameRoundId, betAmount } = body;

    const cancelRequest = {
      brandId,
      manufacturer: MANUFACTURER_ID,
      transactionId: req.params.rollbackTransactionId,
      gameRoundId: String(gameRoundId),
      amount: parseMoney(betAmount.amount),
      timestamp: new Date(),
    };

    try {
      const cancelResult = await api.cancelTransaction(playerId, cancelRequest);
      const balance = await api.getBalance(playerId);

      return res.json({
        balances: formatBalances(balance, playerId),
        extRollbackTransactionId: cancelResult.transactionFound ? String(cancelResult.transactionIds[0]) : '',
      });
    } catch (e) {
      handleBackendError(e, errors.INVALID_PLAYER_SESSION, backendErrors.SESSION_NOT_ACTIVE);
      handleBackendError(e, errors.INVALID_GAME_SESSION, backendErrors.GAME_NOT_FOUND);
      handleBackendError(e, errors.INVALID_ACCOUNT, backendErrors.PLAYER_NOT_FOUND);

      handleBackendError(e, errors.ROLLBACK_BET_TRANSACTION, backendErrors.CANCEL_FAILED);

      throw e;
    }
  } catch (e) {
    return handleError(e, req, res);
  }
});

router.post('/freeroundsresult/:freeRoundsResultTransactionId', async (req: express$Request, res: express$Response) => {
  try {
    const body: FreeRoundsResultRequest = (req.body: any);
    const { brandId, playerId } = await getPlayerId(body);
    const { gameName, totalWin, operatorSessionToken } = body;
    const winRequest = {
      brandId,
      wins: [{ amount: parseMoney(totalWin.amount), type: 'freespins' }],
      manufacturer: MANUFACTURER_ID,
      game: gameName,
      createGameRound: true,
      closeRound: true,
      transactionId: req.params.freeRoundsResultTransactionId,
      timestamp: new Date(),
      sessionId: operatorSessionToken,
      gameRoundId: req.params.freeRoundsResultTransactionId,
    };

    try {
      const winResult = await api.win(playerId, winRequest);

      return res.json({
        balances: formatBalances(winResult, playerId),
        extFreeRoundsResultTransactionId: String(winResult.transactionId),
      });
    } catch (e) {
      handleBackendError(e, errors.INVALID_PLAYER_SESSION, backendErrors.SESSION_NOT_ACTIVE);
      handleBackendError(e, errors.INVALID_GAME_SESSION, backendErrors.GAME_NOT_FOUND);
      handleBackendError(e, errors.INVALID_ACCOUNT, backendErrors.PLAYER_NOT_FOUND);

      handleBackendError(e, errors.INVALID_WIN_TRANSACTION, backendErrors.WIN_FAILED);

      throw e;
    }
  } catch (e) {
    return handleError(e, req, res);
  }
});

module.exports = router;
