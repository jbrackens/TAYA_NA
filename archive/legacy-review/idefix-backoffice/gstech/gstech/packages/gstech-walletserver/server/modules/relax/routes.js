/* @flow */

import type {Win} from "gstech-core/modules/clients/backend-wallet-api";
import type {
  VerifyTokenRequest,
  VerifyTokenResponse,
  BalanceRequest,
  BalanceResponse,
  WithdrawRequest,
  WithdrawResponse,
  DepositRequest,
  DepositResponse,
  RollbackRequest,
  RollbackResponse,
  CancelFreeSpinsRequest,
  RelaxError,
} from './types';

const moment = require('moment-timezone');

const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-wallet-api');
// const money = require('gstech-core/modules/money');
const { getExternalPlayerId, getPlayerId } = require('gstech-core/modules/helpers');
const { MANUFACTURER_ID, DEFAULT_JURISDICTION } = require('./constants');
const errors = require('./types');

const errorResponse = (err: RelaxError, res: express$Response) => {
  const response = {
    errorcode: err.errorcode,
    message: err.message,
  };

  res.statusCode = err.status;
  return res.json(response);
};

const combineWins = (
  gameId: string,
  amount: number,
  txtype: string,
  jackpotpayout?: Array<[number, number]>,
): Win[] => {
  const result = [];

  if (txtype === 'freespinspayout' || txtype === 'fsdeposit') {
    result.push({ type: 'freespins', amount });
  } else {
    const jackpot = jackpotpayout?.map((item) => item[1]).reduce((a, b) => a + b) || 0;

    result.push({ type: 'win', amount: amount - jackpot });
    if (jackpot > 0) {
      const jp_type = gameId.endsWith('dd') ? 'pooled_jackpot' : 'jackpot';
      result.push({ type: jp_type, amount: jackpot });
    }
  }

  return result;
};

const successResponse = (body: any, res: express$Response) => {
  res.statusCode = 200;
  return res.json(body);
};

const verifyToken = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> RLX verifyToken ', { body: req.body });

    const { token } = (req.body: VerifyTokenRequest);

    const { player } = await api.getPlayerBySession(MANUFACTURER_ID, token);

    await api.updatePlayerSession(token, MANUFACTURER_ID, {
      expires: moment().add(20, 'minutes'),
    });

    const externalId = getExternalPlayerId(player);
    const { balance, currencyId, countryId } = player;

    const response: VerifyTokenResponse = {
      customerid: externalId,
      countrycode: countryId,
      customercurrency: currencyId,
      balance,
      cashiertoken: token,
      jurisdiction: DEFAULT_JURISDICTION,
    };

    logger.debug('<<< RLX verifyToken ', { response });
    return successResponse(response, res);
  } catch (e) {
    logger.error('XXX RLX verifyToken failed', { errorCode: e.code, error: e.message });

    if (e.code === 10004) return errorResponse(errors.RLX_INVALID_TOKEN, res);

    return errorResponse(errors.RLX_BLOCKED, res);
  }
};

const getBalance = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> RLX getBalance ', { body: req.body });
    const requestData = (req.body: BalanceRequest);

    let currentPlayer;

    const sessionId = requestData.cashiertoken;
    if (!sessionId) {
      const playerIdentifier = getPlayerId(requestData.customerid);
      currentPlayer = await api.getPlayer(playerIdentifier.id);
    } else {
      const { player } = await api.getPlayerBySession(MANUFACTURER_ID, sessionId);
      await api.updatePlayerSession(sessionId, MANUFACTURER_ID, {
        expires: moment().add(20, 'minutes'),
      });

      currentPlayer = player;
    }

    const { balance, currencyId } = currentPlayer;

    const response: BalanceResponse = {
      customercurrency: currencyId,
      balance,
    };

    logger.debug('<<< RLX getBalance', { response });
    return successResponse(response, res);
  } catch (e) {
    logger.error('XXX RLX getBalance failed', { errorCode: e.code, error: e.message });

    return errorResponse(errors.RLX_COMMON_ERROR, res);
  }
};

const bet = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> RLX withdraw ', { body: req.body });
    const { cashiertoken, customerid, amount, gameref, gamesessionid, txid, ended } =
      (req.body: WithdrawRequest);

    await api.getPlayerBySession(MANUFACTURER_ID, cashiertoken);
    await api.updatePlayerSession(cashiertoken, MANUFACTURER_ID, {
      expires: moment().add(20, 'minutes'),
    });

    const { id: playerId, brandId } = getPlayerId(customerid);

    const internalBetRequest = {
      brandId,
      manufacturer: MANUFACTURER_ID,
      closeRound: ended,
      amount, // It is in cents!
      game: gameref,
      gameRoundId: gamesessionid,
      transactionId: `${txid}`,
      timestamp: new Date(),
      wins: undefined,
      sessionId: cashiertoken,
    };

    const { transactionId, balance } = await api.bet(playerId, internalBetRequest);

    const response: WithdrawResponse = {
      txid,
      remotetxid: `${transactionId}`,
      balance,
    };

    logger.debug('<<< RLX withdraw ', { response });
    return successResponse(response, res);
  } catch (e) {
    logger.error('XXX RLX withdraw failed', { errorCode: e.code, error: e.message });
    if (e.code === 10006) return errorResponse(errors.RLX_INSUFFICIENT_FUNDS, res);
    if (e.code === 10004) return errorResponse(errors.RLX_BLOCKED, res);
    if (e.code === 10005) return errorResponse(errors.RLX_TRANSACTION_DECLINED, res);

    return errorResponse(errors.RLX_COMMON_ERROR, res);
  }
};

const win = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> RLX deposit ', { body: req.body });

    const {
      cashiertoken,
      customerid,
      amount,
      gameref,
      gamesessionid,
      txid,
      ended,
      txtype,
      jackpotpayout,
    } = (req.body: DepositRequest);

    let currentPlayer;

    const sessionId = cashiertoken;
    if (!sessionId) {
      const playerIdentifier = getPlayerId(customerid);
      currentPlayer = await api.getPlayer(playerIdentifier.id);
    } else {
      const { player } = await api.getPlayerBySession(MANUFACTURER_ID, sessionId);
      await api.updatePlayerSession(sessionId, MANUFACTURER_ID, {
        expires: moment().add(20, 'minutes'),
      });

      currentPlayer = player;
    }

    const { id, brandId } = currentPlayer;

    const innerWinRequest = {
      brandId,
      wins: combineWins(gameref, amount, txtype, jackpotpayout),
      manufacturer: MANUFACTURER_ID,
      game: gameref,
      createGameRound: txtype === 'freespinspayout' || txtype === 'fsdeposit',
      closeRound: ended,
      gameRoundId: gamesessionid,
      transactionId: `${txid}`,
      timestamp: new Date(),
      sessionId: cashiertoken || ' ',
    };

    const { transactionId, balance } = await api.win(id, innerWinRequest);

    const response: DepositResponse = {
      txid,
      remotetxid: `${transactionId}`,
      balance,
    };

    logger.debug('<<< RLX deposit ', { response });
    return successResponse(response, res);
  } catch (e) {
    logger.error('XXX RLX deposit failed', { errorCode: e.code, error: e.message });

    if (e.code === 10005) return errorResponse(errors.RLX_TRANSACTION_DECLINED, res);
    return errorResponse(errors.RLX_COMMON_ERROR, res);
  }
};

const rollback = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> RLX rollback ', { body: req.body });
    const requestData = (req.body: RollbackRequest);

    const playerIdentifier = getPlayerId(requestData.customerid);

    const innerCancelRequest = {
      brandId: playerIdentifier.brandId,
      manufacturer: MANUFACTURER_ID,
      transactionId: `${requestData.originaltxid}`,
      cancelTransactionId: `${requestData.txid}`,
      gameRoundId: requestData.gamesessionid,
      timestamp: new Date(),
    };
    const { transactionFound, transactionIds } = await api.cancelTransaction(
      playerIdentifier.id,
      innerCancelRequest,
    );

    if (!transactionFound) {
      return errorResponse(errors.RLX_TRANSACTION_DECLINED, res);
    }

    const { balance } = await api.getBalance(playerIdentifier.id);

    const response: RollbackResponse = {
      txid: requestData.txid,
      remotetxid: transactionIds.join(','),
      balance,
    };

    logger.debug('<<< RLX rollback ', { response });
    return successResponse(response, res);
  } catch (e) {
    logger.error('XXX Relax rollback failed', { error: e.message });

    return errorResponse(errors.RLX_COMMON_ERROR, res);
  }
};

const cancelFreeSpins = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  const response = {};

  try {
    logger.debug('>>> RLX Notify Cancel Free Spins ', { body: req.body });
    const { cashiertoken } = (req.body: CancelFreeSpinsRequest);

    await api.getPlayerBySession(MANUFACTURER_ID, cashiertoken);

    logger.debug('>>> RLX Notify Cancel Free Spins ');
    return successResponse(response, res);
  } catch (e) {
    logger.error('XXX Relax Notify Cancel Free Spins failed', { error: e.message });

    return successResponse(response, res);
  }
};

module.exports = {
  verifyToken,
  getBalance,
  bet,
  win,
  rollback,
  cancelFreeSpins,
};
