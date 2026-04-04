/* @flow */
import type {
  IDENTIFICATION,
  ErrorResponse,
  NolimitCityRequest,
  NolimitCityResponse,
  ValidateTokenRequest,
  ValidateTokenResponse,
  WithdrawRequest,
  WithdrawResponse,
  DepositRequest,
  DepositResponse,
  RollbackRequest,
  RollbackResponse,
  BalanceRequest,
  BalanceResponse,
  KeepAliveRequest,
  KeepAliveResponse,
} from './types';

const logger = require('gstech-core/modules/logger');

const api = require('gstech-core/modules/clients/backend-wallet-api');
const { getPlayerId, getExternalPlayerId } = require('gstech-core/modules/helpers');
const { asFloat, parseMoney } = require('gstech-core/modules/money');
const { nickName } = require('gstech-core/modules/clients/backend-wallet-api');
const { MANUFACTURER_ID } = require('./constants');
const config = require('../../../config');

const configuration = config.providers.nolimitcity;

const operators = ['CASINOJEFE', 'HIPSPIN', 'JUSTWOW', 'LUCKYDINO', 'OLASPILLL', 'FRESHSPINS', 'VIEBET'];

const errorResponse = (request: NolimitCityRequest<any>, code: number, message: string, res: express$Response) => {
  const response: ErrorResponse = {
    jsonrpc: request.jsonrpc,
    id: request.id,
    error: {
      code: -32000,
      message: 'Server error',
      data: {
        code,
        message,
      },
    },
  };

  return res.status(200).json(response);
};

const validateToken = async (request: ValidateTokenRequest): Promise<ValidateTokenResponse> => {
  const { player } = await api.getPlayerBySession('NC', request.token);
  const { id, brandId } = player;
  const balanceRes = await api.getBalance(player.id);

  const response = {
    userId: getExternalPlayerId({ id, brandId }),
    username: nickName(player),
    balance: {
      amount: asFloat(balanceRes.balance),
      currency: player.currencyId,
    },
  };

  return response;
};

const withdraw = async (request: WithdrawRequest): Promise<WithdrawResponse> => {
  const player = getPlayerId(request.userId);

  const betRequest = {
    brandId: player.brandId,
    manufacturer: MANUFACTURER_ID,
    closeRound: false,
    amount: parseMoney(request.withdraw.amount),
    game: request.information.game,
    gameRoundId: request.information.gameRoundId,
    transactionId: request.information.uniqueReference,
    timestamp: new Date(),
    wins: undefined,
    sessionId: undefined,
  };

  const betResult = await api.bet(player.id, betRequest);

  return {
    balance: {
      amount: asFloat(betResult.balance),
      currency: betResult.currencyId,
    },
    transactionId: betResult.transactionId.toString(),
  };
};

const deposit = async (request: DepositRequest): Promise<DepositResponse> => {
  const player = getPlayerId(request.userId);

  const winRequest = {
    brandId: player.brandId,
    wins: [{ amount: parseMoney(request.deposit.amount), type: request.promoName ? 'freespins' : 'win' }],
    manufacturer: MANUFACTURER_ID,
    game: request.information.game,
    closeRound: true,
    gameRoundId: request.information.gameRoundId,
    transactionId: request.information.uniqueReference,
    timestamp: new Date(),
    sessionId: undefined,
    createGameRound: false,
  };

  const winResult = await api.win(player.id, winRequest);

  return {
    balance: {
      amount: asFloat(winResult.balance),
      currency: winResult.currencyId,
    },
    transactionId: winResult.transactionId.toString(),
  };
};

const rollback = async (request: RollbackRequest): Promise<RollbackResponse> => {
  const player = getPlayerId(request.userId);

  const cancelRequest = {
    brandId: player.brandId,
    manufacturer: MANUFACTURER_ID,
    gameRoundId: request.information.gameRoundId,
    transactionId: request.information.uniqueReference,
    timestamp: new Date(),
  };

  const cancelResult = await api.cancelTransaction(player.id, cancelRequest);
  const balanceRes = await api.getBalance(player.id);

  return {
    balance: {
      amount: asFloat(balanceRes.balance),
      currency: balanceRes.currencyId,
    },
    transactionId: (cancelResult.transactionIds[0] && cancelResult.transactionIds[0].toString()) || '',
  };
};

const balance = async (request: BalanceRequest): Promise<BalanceResponse> => {
  if (request.userId) {
    const player = getPlayerId(request.userId);

    const balanceRes = await api.getBalance(player.id);

    return {
      balance: {
        amount: asFloat(balanceRes.balance),
        currency: balanceRes.currencyId,
      },
    };
  }

  if (request.userIds) {
    const results = await Promise.all(
      request.userIds.map(async (uid) => {
        const player = getPlayerId(uid);
        const balanceRes = await api.getBalance(player.id);

        return { userId: uid, balance: balanceRes.balance, currencyId: balanceRes.currencyId };
      }),
    );

    const balances = results.reduce<{ [string]: { amount: Money, currency: string } }>(
      (result, item) => {
        result = result || {}; // eslint-disable-line no-param-reassign
        result[item.userId] = { // eslint-disable-line no-param-reassign
          amount: item.balance,
          currency: item.currencyId,
        };
        return result;
      },
      {},
    );

    return {
      // $FlowFixMe[incompatible-return] confirm if we're meant to return amount as string of number
      balances,
    };
  }

  throw Error('neither userId nor userIds found in the request');
};

const keepAlive = async (request: KeepAliveRequest): Promise<KeepAliveResponse> => // eslint-disable-line no-unused-vars
  ({});

const handler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  logger.debug('Nolimit city request', { body: req.body });
  const request: NolimitCityRequest<any> = req.body;

  try {
    const response: NolimitCityResponse<any> = {
      jsonrpc: request.jsonrpc,
      id: request.id,
      result: {},
    };

    const { identification }: { identification: IDENTIFICATION } = request.params;

    if (!operators.includes(identification.name) || identification.key !== configuration.key) {
      logger.error('Nolimit city authorization failed', { request: req.body });

      return errorResponse(request, 14000, 'Authorization failed', res);
    }

    switch (request.method) {
      case 'wallet.validate-token':
        response.result = await validateToken(request.params);
        break;
      case 'wallet.withdraw':
        response.result = await withdraw(request.params);
        break;
      case 'wallet.deposit':
        response.result = await deposit(request.params);
        break;
      case 'wallet.rollback':
        response.result = await rollback(request.params);
        break;
      case 'wallet.balance':
        response.result = await balance(request.params);
        break;
      case 'wallet.keep-alive':
        response.result = await keepAlive(request.params);
        break;
      default:
        break;
    }

    return res.json(response);
  } catch (e) {
    if (e.code === 10004) return errorResponse(request, 14002, 'Token error', res);
    if (e.code === 10006) return errorResponse(request, 14001, 'Balance too low', res);
    if (e.code === 10008) return errorResponse(request, 14005, 'Bet not allowed', res);
    if (e.code === 10009) return errorResponse(request, 14005, 'Bet not allowed', res);

    logger.error('Nolimit city request failed', { request: req.body, error: e });

    return errorResponse(request, 14000, 'Internal Server Error', res);
  }
};

module.exports = {
  handler,
};
