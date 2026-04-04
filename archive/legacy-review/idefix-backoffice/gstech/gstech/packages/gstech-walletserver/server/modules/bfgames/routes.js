 
/* @flow */
import type { PlayerWithBalance } from 'gstech-core/modules/clients/backend-wallet-api';
import type { BFCommonRequest, BFCommonResponse, BFCommonError } from './types';

const crypto = require('crypto');

const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const { nickName } = require('gstech-core/modules/clients/backend-wallet-api');
const config = require('../../../config');
const { MANUFACTURER_ID } = require('./constants');

const configuration = config.providers.bfgames;

const errorResponse = (methodName: string, reflectionId: number, errorCode: number, res: express$Response) => {
  const response: BFCommonError = {
    methodname: methodName,
    reflection: {
      id: reflectionId,
    },
    servicenumber: 1,
    servicename: 'BFGamesSeamless',
    result: {
      errorcode: errorCode,
    },
    type: 'jsonwsp/response',
    version: '1.0',
  };

  return res.status(200).json(response);
};

const authenticateToken = async (sessionId: string, player: PlayerWithBalance, methodName: string, reflectionId: number, res: express$Response) => {
  const balance = await api.getBalance(player.id);
  const { id, brandId } = player;
  const response: BFCommonResponse = {
    methodname: methodName,
    reflection: {
      id: reflectionId,
    },
    servicenumber: 1,
    servicename: 'BFGamesSeamless',
    result: {
      errorcode: null,
      player_id: getExternalPlayerId({ id, brandId }),
      currency: player.currencyId,
      balance: balance.balance,
      nickname: nickName(player),
      token: sessionId,
    },
    type: 'jsonwsp/response',
    version: '1.0',
  };

  return res.json(response);
};

const tokenRefresh = async (sessionId: string, player: PlayerWithBalance, methodName: string, reflectionId: number, res: express$Response) => {
  const balance = await api.getBalance(player.id);

  const response: BFCommonResponse = {
    methodname: methodName,
    reflection: {
      id: reflectionId,
    },
    servicenumber: 1,
    servicename: 'BFGamesSeamless',
    result: {
      errorcode: null,
      currency: player.currencyId,
      balance: balance.balance,
      token: sessionId,
    },
    type: 'jsonwsp/response',
    version: '1.0',
  };

  return res.json(response);
};

const getBalance = async (sessionId: string, player: PlayerWithBalance, methodName: string, reflectionId: number, res: express$Response) => {
  const balance = await api.getBalance(player.id);

  const response: BFCommonResponse = {
    methodname: methodName,
    reflection: {
      id: reflectionId,
    },
    servicenumber: 1,
    servicename: 'BFGamesSeamless',
    result: {
      errorcode: null,
      currency: player.currencyId,
      balance: balance.balance,
      token: sessionId,
    },
    type: 'jsonwsp/response',
    version: '1.0',
  };

  return res.json(response);
};

const withdraw = async (amount: number, game: string, roundId: string, actionId: string, sessionId: string, player: PlayerWithBalance, methodName: string, reflectionId: number, res: express$Response) => {
  const transactions = await api.getRoundTransactions(player.id, {
    gameRoundId: roundId,
    manufacturer: MANUFACTURER_ID,
    timestamp: new Date(),
  });

  if (transactions.length > 0) {
    return errorResponse('withdraw', reflectionId, 3000, res);
  }

  const betRequest = {
    brandId: player.brandId,
    manufacturer: MANUFACTURER_ID,
    closeRound: false,
    amount,
    game,
    gameRoundId: roundId,
    transactionId: actionId,
    timestamp: new Date(),
    wins: undefined,
    sessionId,
  };

  const betResult = await api.bet(player.id, betRequest);

  const response: BFCommonResponse = {
    methodname: methodName,
    reflection: {
      id: reflectionId,
    },
    servicenumber: 1,
    servicename: 'BFGamesSeamless',
    result: {
      errorcode: betResult.existingTransaction ? 3000 : null,
      balance: betResult.balance,
      currency: player.currencyId,
      transaction_id: `${betResult.transactionId}`,
      token: sessionId,
    },
    type: 'jsonwsp/response',
    version: '1.0',
  };

  return res.json(response);
};

const deposit = async (amount: number, game: string, roundId: string, actionId: string, sessionId: string, player: PlayerWithBalance | { brandId: string, id: number, currencyId: string }, methodName: string, reflectionId: number, offline: boolean, bonus_instance_id: string, res: express$Response) => {
  const transactions = await api.getRoundTransactions(player.id, {
    gameRoundId: roundId,
    manufacturer: MANUFACTURER_ID,
    timestamp: new Date(),
  });

  if (transactions.filter(t => t.externalTransactionId === actionId).length > 0) {
    return errorResponse('deposit', reflectionId, 3000, res);
  }

  if (transactions.filter(t => t.type === 'win').length > 0) {
    return errorResponse('deposit', reflectionId, 3002, res);
  }

  if (transactions.filter(t => t.type === 'cancel_bet').length > 0) {
    return errorResponse('deposit', reflectionId, 3002, res);
  }

  const winRequest = {
    brandId: player.brandId,
    wins: [{ amount, type: bonus_instance_id ? 'freespins' : 'win' }],
    manufacturer: MANUFACTURER_ID,
    game,
    closeRound: true,
    gameRoundId: roundId,
    transactionId: actionId,
    timestamp: new Date(),
    sessionId: undefined,
    createGameRound: !!bonus_instance_id,
  };

  const winResult = await api.win(player.id, winRequest);

  const response: BFCommonResponse = {
    methodname: methodName,
    reflection: {
      id: reflectionId,
    },
    servicenumber: 1,
    servicename: 'BFGamesSeamless',
    result: {
      errorcode: winResult.existingTransaction ? 3000 : null,
      balance: winResult.balance,
      currency: player.currencyId,
      transaction_id: `${winResult.transactionId}`,
      token: sessionId,
    },
    type: 'jsonwsp/response',
    version: '1.0',
  };

  return res.json(response);
};

const rollback = async (amount: number, game: string, roundId: string, transactionId: string, actionId: string, sessionId: string, player: PlayerWithBalance | { brandId: string, id: number, currencyId: string }, methodName: string, reflectionId: number, res: express$Response) => {
  const transactions = await api.getRoundTransactions(player.id, {
    gameRoundId: roundId,
    manufacturer: MANUFACTURER_ID,
    timestamp: new Date(),
  });

  if (transactions.filter(t => t.type === 'win').length > 0) {
    return errorResponse('rollback', reflectionId, 3002, res);
  }

  const allTransaction = await api.getTransaction(player.id, {
    brandId: player.brandId,
    manufacturer: 'BFG',
    transactionId: actionId,
    timestamp: new Date(),
  });

  if (allTransaction.length > 0) {
    return errorResponse('rollback', reflectionId, 3000, res);
  }

  const cancelRequest = {
    brandId: player.brandId,
    manufacturer: MANUFACTURER_ID,
    gameRoundId: roundId,
    amount,
    transactionId,
    timestamp: new Date(),
    currencyId: player.currencyId,
    cancelTransactionId: actionId,
  };

  const cancelResult = await api.cancelTransaction(player.id, cancelRequest);
  const balanceRes = await api.getBalance(player.id);

  const response: BFCommonResponse = {
    methodname: methodName,
    reflection: {
      id: reflectionId,
    },
    servicenumber: 1,
    servicename: 'BFGamesSeamless',
    result: {
      // eslint-disable-next-line no-nested-ternary
      errorcode: !cancelResult.transactionFound ? 3001 : cancelResult.alreadyCancelled ? 3000 : cancelResult.invalidTransaction ? 3002 : null,
      balance: balanceRes.balance,
      currency: player.currencyId,
      transaction_id: cancelResult.transactionIds[0],
    },
    type: 'jsonwsp/response',
    version: '1.0',
  };

  return res.json(response);
};

const callback = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  const request: BFCommonRequest = ((req.body): any);
  logger.debug('bs games callback: ', request);
  try {
    const { args: { caller_id, caller_password, token } } = request;

    if (caller_id !== configuration.username || caller_password !== configuration.password) {
      return errorResponse(request.methodname, request.mirror.id, 2000, res);
    }

    let player;
    if (request.args.offline === true) {
      const [tokenHash, brandId, id] = request.args.token.split('_');

      const hashCandidate = crypto
        .createHash('sha224')
        .update(`${configuration.api.offlineToken}${caller_id}${request.args.round_id}${request.args.action_id}${request.args.amount}`)
        .digest('hex');
      if (tokenHash !== hashCandidate) {
        return errorResponse(request.methodname, request.mirror.id, 2001, res);
      }

      player = {
        brandId,
        id: Number(id),
        currencyId: request.args.currency,
      };
    } else {
      const { player: player1 } = await api.getPlayerBySession('BFG', token);
      player = player1;
    }
    switch (request.methodname) {
      case 'authenticateToken':
        return await authenticateToken(request.args.token, ((player: any): PlayerWithBalance), request.methodname, request.mirror.id, res);
      case 'tokenRefresh':
        return await tokenRefresh(request.args.token, ((player: any): PlayerWithBalance), request.methodname, request.mirror.id, res);
      case 'getBalance':
        return await getBalance(request.args.token, ((player: any): PlayerWithBalance), request.methodname, request.mirror.id, res);
      case 'withdraw':
        return await withdraw(request.args.amount, request.args.game_ref, request.args.round_id, request.args.action_id, request.args.token, ((player: any): PlayerWithBalance), request.methodname, request.mirror.id, res);
      case 'deposit':
        return await deposit(request.args.amount, request.args.game_ref, request.args.round_id, request.args.action_id, request.args.token, player, request.methodname, request.mirror.id, request.args.offline, request.args.bonus_instance_id, res);
      case 'rollback':
        return await rollback(request.args.amount, request.args.game_ref, request.args.round_id, request.args.rollback_action_id, request.args.action_id, request.args.token, player, request.methodname, request.mirror.id, res);
      default:
        return errorResponse(request.methodname, request.mirror.id, 1003, res);
    }
  } catch (e) {
    if (e.code === 10004) return errorResponse(request.methodname, request.mirror.id, 2001, res);
    if (e.code === 10006) return errorResponse(request.methodname, request.mirror.id, 4000, res);
    if (e.code === 10008) return errorResponse(request.methodname, request.mirror.id, 1000, res);
    if (e.code === 10009) return errorResponse(request.methodname, request.mirror.id, 1000, res);

    logger.error('BF Games callback failed', e);

    if (e.code === 10003) return errorResponse(request.methodname, request.mirror.id, 3001, res);
    if (e.code === 10007) return errorResponse(request.methodname, request.mirror.id, 3002, res);

    return errorResponse(request.methodname, request.mirror.id, 1000, res);
  }
};

module.exports = {
  callback,
};
