/* @flow */

import type { Win } from "gstech-core/modules/clients/backend-wallet-api";
import type {
  CheckUserRequest,
  CheckUserResponse,
  BalanceRequest,
  StandardResponse,
  DebitRequest,
  CreditRequest,
  PromoRequest,
  CancelRequest,
  CreditOrCancelRequestJackpot
} from './types';

const { v1: uuid } = require('uuid');
const _ = require('lodash');
const { axios } = require('gstech-core/modules/axios');

const logger = require('gstech-core/modules/logger');
const walletAPI = require('gstech-core/modules/clients/backend-wallet-api');
const money = require('gstech-core/modules/money');
const { getPlayerId } = require('gstech-core/modules/helpers');
const oss = require('./oss');
const { MANUFACTURER_ID } = require('./constants');
const config = require('../../../config');

const configuration = config.providers.evoOSS;

const LOCAL_JACKPOT_IDS = [
  // list obtained from EVO, doesn't mean we have all these.
  'bof_mega',
  'gof_mega',
  'megajoker',
  'hog_large',
  'hog_small',
  'megajackpot2',
  'megajackpot3',
  'tt_mega',
  'vegasnightlife_mega',
]

const standardResponse = (status: string, res: express$Response) => {
  const response: StandardResponse = {
    status,
    uuid: uuid(),
  };
  return res.json(response);
};

const checkToken = (authToken: string): boolean =>
  authToken !== undefined && authToken === configuration.authToken;

const check = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> EvoOSS CHECK', { body: req.body });
    if (!checkToken(req.query.authToken)) {
      logger.error('XXX EvoOSS CHECK [INVALID TOKEN]', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }
    const body = ((req.body: any): CheckUserRequest);
    const playerIdentifier = getPlayerId(body.userId);
    await walletAPI.getPlayer(playerIdentifier.id);
    const response: CheckUserResponse = {
      status: 'OK',
      sid: body.sid,
      uuid: uuid(),
    };
    logger.debug('<<< EvoOSS CHECK', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX EvoOSS CHECK', { request: req.body, code: e.code, error: e.error });
    if (e.code === 10001) return standardResponse('INVALID_PARAMETER', res);
    if (e.message.startsWith('Invalid externalPlayerId'))
      return standardResponse('INVALID_PARAMETER', res);
    return standardResponse('UNKNOWN_ERROR', res);
  }
};

const balance = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> EvoOSS BALANCE', { body: req.body });
    if (!checkToken(req.query.authToken)) {
      logger.error('XXX EvoOSS BALANCE [INVALID TOKEN]', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }
    const body = ((req.body: any): BalanceRequest);
    await walletAPI.getPlayerBySession(MANUFACTURER_ID, body.sid);
    const playerIdentifier = getPlayerId(body.userId);
    const balanceRes = await walletAPI.getBalance(playerIdentifier.id);
    const response: StandardResponse = {
      status: 'OK',
      balance: money.formatMoney(balanceRes.realBalance),
      bonus: money.formatMoney(balanceRes.bonusBalance),
      uuid: uuid(),
    };
    logger.debug('<<< EvoOSS BALANCE', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX EvoOSS BALANCE', { request: req.body, code: e.code, error: e.error });
    if (e.code === 10004) return standardResponse('INVALID_SID', res);
    if (e.code === 10001) return standardResponse('INVALID_PARAMETER', res);
    if (e.message.startsWith('Invalid externalPlayerId'))
      return standardResponse('INVALID_PARAMETER', res);
    return standardResponse('UNKNOWN_ERROR', res);
  }
};

// Used to debit from account (place bets)
const debit = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> EvoOSS DEBIT', { body: req.body });
    if (!checkToken(req.query.authToken)) {
      logger.error('XXX EvoOSS DEEBIT [INVALID TOKEN]', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }
    const body = ((req.body: any): DebitRequest);
    await walletAPI.getPlayerBySession(MANUFACTURER_ID, body.sid);
    const playerIdentifier = getPlayerId(body.userId);
    const balanceRes = await walletAPI.getBalance(playerIdentifier.id);
    if (balanceRes.balance < money.parseMoney(body.transaction.amount)) {
      const response: StandardResponse = {
        status: 'INSUFFICIENT_FUNDS',
        balance: money.formatMoney(balanceRes.realBalance),
        bonus: money.formatMoney(balanceRes.bonusBalance),
        uuid: uuid(),
      };
      logger.debug('<<< EvoOSS DEBIT', { response });
      return res.json(response);
    }
    const betRequest = {
      brandId: playerIdentifier.brandId,
      manufacturer: MANUFACTURER_ID,
      closeRound: false,
      amount: money.parseMoney(body.transaction.amount),
      useGameId: true,
      game: `EVO_${body.game.details.table.id}`,
      gameRoundId: `${playerIdentifier.id}-${body.game.id}`,
      transactionId: body.transaction.id,
      timestamp: new Date(),
      wins: undefined,
      sessionId: body.sid,
      currencyId: body.currency,
    };
    const betResult = await walletAPI.bet(playerIdentifier.id, betRequest);
    if (betResult.existingTransaction) {
      const response: StandardResponse = {
        status: 'BET_ALREADY_EXIST',
        uuid: uuid(),
      };
      logger.debug('<<< EvoOSS DEBIT', { response });
      return res.json(response);
    }
    const response: StandardResponse = {
      status: 'OK',
      balance: money.formatMoney(betResult.realBalance),
      bonus: money.formatMoney(betResult.bonusBalance),
      uuid: uuid(),
    };
    logger.debug('<<< EvoOSS DEBIT', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX EvoOSS DEBIT', { request: req.body, code: e.code, error: e.error });
    if (e.code === 10004) return standardResponse('INVALID_SID', res);
    if (e.code === 10006) return standardResponse('INSUFFICIENT_FUNDS', res);
    if (e.code === 10008) return standardResponse('UNKNOWN_ERROR', res);
    if (e.code === 10009) return standardResponse('UNKNOWN_ERROR', res);
    if (e.code === 10001) return standardResponse('INVALID_PARAMETER', res);
    if (e.message.startsWith('Invalid externalPlayerId'))
      return standardResponse('INVALID_PARAMETER', res);
    return standardResponse('UNKNOWN_ERROR', res);
  }
};

// Used to credit user's account (settle bets)
const credit = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> EvoOSS CREDIT', { body: req.body });
    if (!checkToken(req.query.authToken)) {
      logger.error('XXX EvoOSS CREDIT [INVALID TOKEN]', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }
    const body = ((req.body: any): CreditRequest);
    await walletAPI.getPlayerBySession(MANUFACTURER_ID, body.sid);
    const playerIdentifier = getPlayerId(body.userId);
    const localJackpotAmounts =
      _.sumBy<CreditOrCancelRequestJackpot>(
        body.transaction.jackpots,
        ({ id, winAmount }) => LOCAL_JACKPOT_IDS.includes(id) ? winAmount : 0,
      );
    const globalJackpotAmounts =
      _.sumBy<CreditOrCancelRequestJackpot>(
        body.transaction.jackpots,
        ({ id, winAmount }) => !LOCAL_JACKPOT_IDS.includes(id) ? winAmount : 0,
      );
    const jackpotAmounts = Math.min(
      body.transaction.amount,
      localJackpotAmounts + globalJackpotAmounts,
    );
    const winRequest = {
      brandId: playerIdentifier.brandId,
      wins: _.compact<Win>([
        { amount: money.parseMoney(body.transaction.amount - jackpotAmounts), type: 'win' },
        localJackpotAmounts > 0
          ? { amount: money.parseMoney(localJackpotAmounts), type: 'jackpot' }
          : null,
        globalJackpotAmounts > 0
          ? { amount: money.parseMoney(globalJackpotAmounts), type: 'pooled_jackpot' }
          : null,
      ]),
      manufacturer: MANUFACTURER_ID,
      useGameId: true,
      game: `EVO_${body.game.details.table.id}`,
      createGameRound: false,
      closeRound: true,
      gameRoundId: `${playerIdentifier.id}-${body.game.id}`,
      transactionId: body.transaction.id,
      timestamp: new Date(),
      sessionId: body.sid,
      currencyId: body.currency,
    };
    const winResult = await walletAPI.win(playerIdentifier.id, winRequest);
    const response: StandardResponse = {
      status: 'OK',
      balance: money.formatMoney(winResult.realBalance),
      bonus: money.formatMoney(winResult.bonusBalance),
      uuid: uuid(),
    };
    logger.debug('<<< EvoOSS CREDIT', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX EvoOSS CREDIT', { request: req.body, code: e.code, error: e.error });
    if (e.code === 10004) return standardResponse('INVALID_SID', res);
    if (e.code === 10001) return standardResponse('INVALID_PARAMETER', res);
    if (e.message.startsWith('Invalid externalPlayerId'))
      return standardResponse('INVALID_PARAMETER', res);
    return standardResponse('UNKNOWN_ERROR', res);
  }
};

const cancel = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> EvoOSS CANCEL', { body: req.body });
    if (!checkToken(req.query.authToken)) {
      logger.error('XXX EvoOSS CANCEL [INVALID TOKEN]', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }
    const body = ((req.body: any): CancelRequest);
    await walletAPI.getPlayerBySession(MANUFACTURER_ID, body.sid);
    const playerIdentifier = getPlayerId(body.userId);
    const cancelRequest = {
      brandId: playerIdentifier.brandId,
      manufacturer: MANUFACTURER_ID,
      transactionId: body.transaction.id,
      gameRoundId: `${playerIdentifier.id}-${body.game.id}`,
      amount: money.parseMoney(body.transaction.amount),
      timestamp: new Date(),
      currencyId: body.currency,
    };
    await walletAPI.cancelTransaction(playerIdentifier.id, cancelRequest);
    const balanceRes = await walletAPI.getBalance(playerIdentifier.id);
    const response: StandardResponse = {
      status: 'OK',
      balance: money.formatMoney(balanceRes.realBalance),
      bonus: money.formatMoney(balanceRes.bonusBalance),
      uuid: uuid(),
    };
    logger.debug('<<< EvoOSS CANCEL', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX EvoOSS CANCEL', { request: req.body, code: e.code, error: e.error });
    if (e.code === 10004) return standardResponse('INVALID_SID', res);
    if (e.code === 10001) return standardResponse('INVALID_PARAMETER', res);
    if (e.message.startsWith('Invalid externalPlayerId'))
      return standardResponse('INVALID_PARAMETER', res);
    return standardResponse('UNKNOWN_ERROR', res);
  }
};

const sid = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> EvoOSS SID', { body: req.body });
    if (!checkToken(req.query.authToken)) {
      logger.error('XXX EvoOSS SID [INVALID TOKEN]', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }
    const body = ((req.body: any): CheckUserRequest);
    let email;
    let password;
    if (body.userId === 'LD_3000400') {
      email = 'evolution-eur@luckydino.com';
      password = '#Pf#uF?Gas?Us7pD';
    }
    if (body.userId === 'LD_3000401') {
      email = 'evolution-usd@luckydino.com';
      password = '#Pf#uF?Gas?Us7pD';
    }
    const playerIdentifier = getPlayerId(body.userId);
    const token = config.api.backend.staticTokens[(playerIdentifier.brandId: any)];
    const { data: loginResponse } = await axios.request({
      method: 'POST',
      url: `${config.api.backend.url}/api/LD/v1/login`,
      data: {
        email,
        password,
        ipAddress: '94.222.17.20',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36',
      },
      headers: { 'X-Token': token },
    });
    logger.debug('loginResponse', { loginResponse });
    const { data: launchGameResponse } = await axios.request({
      method: 'POST',
      url: `${config.api.backend.url}/api/LD/v1/game/29`,
      data: { parameters: {} },
      headers: { Authorization: `Token ${loginResponse.token}`, 'X-Token': token },
    });
    logger.debug('launchGameResponse', { launchGameResponse });
    const response: CheckUserResponse = {
      status: 'OK',
      sid: launchGameResponse.sessionId,
      uuid: uuid(),
    };
    logger.debug('<<< EvoOSS SID', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX EvoOSS SID', { request: req.body, code: e.code, error: e.error });
    return standardResponse('UNKNOWN_ERROR', res);
  }
};

const promo = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> EvoOSS PROMOPAYOUT', { body: req.body });
    if (!checkToken(req.query.authToken)) {
      logger.error('XXX EvoOSS PROMOPAYOUT [INVALID TOKEN]', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }
    const { sid: mSessionId, userId, promoTransaction, currency } = (req.body: PromoRequest);
    const { voucherId, amount, id: transactionId } = promoTransaction;
    const tableId = await oss.resolveTableIdFromVoucher(userId, voucherId);
    const { brandId, id: playerId } = getPlayerId(userId);
    const playerBySession = await walletAPI.getPlayerBySession(MANUFACTURER_ID, mSessionId);
    logger.debug('+++ EvoOSS PROMOPAYOUT', { playerBySession });
    if (!playerBySession.sessions[0]?.parameters?.gameId.endsWith(tableId))
      logger.warn('+++ EvoOSS PROMOPAYOUT Table Mistmatch', { tableId, playerBySession });
    const winRequest = {
      brandId,
      wins: [{ amount: money.parseMoney(amount), type: 'freespins' }],
      manufacturer: MANUFACTURER_ID,
      useGameId: true,
      game: `${MANUFACTURER_ID}_${tableId}`,
      createGameRound: true,
      closeRound: true,
      gameRoundId: `${playerId}-${voucherId}`,
      transactionId,
      timestamp: new Date(),
      sessionId: mSessionId,
      currencyId: currency,
    };
    const { realBalance, bonusBalance } = await walletAPI.win(playerId, winRequest);
    const response: StandardResponse = {
      status: 'OK',
      balance: money.formatMoney(realBalance),
      bonus: money.formatMoney(bonusBalance),
      uuid: uuid(),
    };
    logger.debug('<<< EvoOSS PROMOPAYOUT', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX EvoOSS PROMOPAYOUT', { request: req.body, code: e.code, error: e.error });
    if (e.code === 10004) return standardResponse('INVALID_SID', res);
    if (e.code === 10001) return standardResponse('INVALID_PARAMETER', res);
    if (e.message.startsWith('Invalid externalPlayerId'))
      return standardResponse('INVALID_PARAMETER', res);
    return standardResponse('UNKNOWN_ERROR', res);
  }
};

module.exports = {
  check,
  balance,
  debit,
  credit,
  cancel,
  promo,
  sid,
};
