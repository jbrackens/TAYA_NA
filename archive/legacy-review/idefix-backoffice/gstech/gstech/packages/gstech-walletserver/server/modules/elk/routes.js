/* @flow */

import type {
  GetAccountRequest,
  GetAccountResponse,
  GetBalanceRequest,
  GetBalanceResponse,
  GetWagerRequest,
  GetWagerResponse,
  GetResultRequest,
  GetResultResponse,
  GetRollbackRequest,
  GetRollbackResponse,
} from './types';

const { v1: uuid } = require('uuid');
const xml = require('xml2js');

const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const { getPlayerId, getExternalPlayerId } = require('gstech-core/modules/helpers');
const { asFloat, parseMoney } = require('gstech-core/modules/money');
const { nickName } = require('gstech-core/modules/clients/backend-wallet-api');
const { getJurisdiction } = require('../jurisdiction');
const { MANUFACTURER_ID } = require('./constants');
const config = require('../../../config');

const configuration = config.providers.elk;
const builder = new xml.Builder({
  renderOpts: { pretty: false },
});

const errorResponse = (request: any, code: number, message: string, res: express$Response): express$Response => {
  const response = {
    RSP: {
      $: {
        action: request.REQ.$.action,
        rc: code,
        msg: message,
      },
    },
  };

  res.set('Content-Type', 'text/xml');
  const xmlObj = builder.buildObject(response);

  return res.status(200).send(xmlObj);
};

const getAccount = async (request: GetAccountRequest): Promise<GetAccountResponse> => {
  const { player } = await api.getPlayerBySession('ELK', request.TOKEN);
  const { id, brandId } = player;

  const response = {
    OPERATORID: request.OPERATORID,
    ACCOUNTID: getExternalPlayerId({ id, brandId }),
    CURRENCY: player.currencyId,
    JURISDICTION: getJurisdiction(player),
    SCREENNAME: nickName(player),
  };

  return response;
};

const getBalance = async (
  request: GetBalanceRequest,
): Promise<GetBalanceResponse> => {
  const player = getPlayerId(request.ACCOUNTID);
  const balanceRes = await api.getBalance(player.id);

  if (request.CURRENCY !== balanceRes.currencyId) {
    throw Error('Currency does not match');
  }

  const response = {
    OPERATORID: request.OPERATORID,
    ACCOUNTID: request.ACCOUNTID,
    CURRENCY: request.CURRENCY,
    BALANCE: asFloat(balanceRes.balance),
  };

  return response;
};

const wager = async (request: GetWagerRequest): Promise<GetWagerResponse> => {
  const player = getPlayerId(request.ACCOUNTID);

  const betRequest = {
    brandId: player.brandId,
    manufacturer: MANUFACTURER_ID,
    closeRound: false,
    amount: parseMoney(request.AMOUNT),
    game: request.GAMEID,
    gameRoundId: request.ROUNDID,
    transactionId: request.TXID,
    timestamp: new Date(),
    wins: undefined,
    sessionId: undefined,
  };

  const betResult = await api.bet(player.id, betRequest);

  const response = {
    OPERATORID: request.OPERATORID,
    ACCOUNTID: request.ACCOUNTID,
    WALLETTXID: betResult.transactionId.toString(),
    CURRENCY: request.CURRENCY,
    BALANCE: asFloat(betResult.balance),
    REALMONEY: request.AMOUNT,
    BONUSMONEY: '0.00',
  };

  return response;
};

const result = async (request: GetResultRequest): Promise<GetResultResponse> => {
  const player = getPlayerId(request.ACCOUNTID);

  const winRequest = {
    brandId: player.brandId,
    wins: [{ amount: parseMoney(request.AMOUNT), type: 'win' }],
    manufacturer: MANUFACTURER_ID,
    game: request.GAMEID,
    closeRound: true,
    gameRoundId: request.ROUNDID,
    transactionId: request.TXID,
    timestamp: new Date(),
    sessionId: undefined,
    createGameRound: false,
  };

  const winResult = await api.win(player.id, winRequest);

  const response = {
    OPERATORID: request.OPERATORID,
    ACCOUNTID: request.ACCOUNTID,
    WALLETTXID: winResult.transactionId.toString(),
    CURRENCY: request.CURRENCY,
    BALANCE: asFloat(winResult.balance),
  };

  return response;
};

const deposit = async (request: GetResultRequest): Promise<GetResultResponse> => {
  const player = getPlayerId(request.ACCOUNTID);

  const winRequest = {
    brandId: player.brandId,
    wins: [{ amount: parseMoney(request.AMOUNT), type: 'freespins' }],
    manufacturer: MANUFACTURER_ID,
    game: '10014', // TODO: free round have no relation to the game
    closeRound: true,
    gameRoundId: uuid(),
    transactionId: request.TXID,
    timestamp: new Date(),
    sessionId: undefined,
    createGameRound: true,
  };

  const winResult = await api.win(player.id, winRequest);

  const response = {
    OPERATORID: request.OPERATORID,
    ACCOUNTID: request.ACCOUNTID,
    WALLETTXID: winResult.transactionId.toString(),
    CURRENCY: request.CURRENCY,
    BALANCE: asFloat(winResult.balance),
  };

  return response;
};

const rollback = async (request: GetRollbackRequest): Promise<GetRollbackResponse> => {
  const player = getPlayerId(request.ACCOUNTID);

  const cancelRequest = {
    brandId: player.brandId,
    manufacturer: MANUFACTURER_ID,
    gameRoundId: request.ROUNDID,
    amount: parseMoney(request.AMOUNT),
    transactionId: request.ROLLBACKTXID,
    timestamp: new Date(),
  };

  const cancelResult = await api.cancelTransaction(player.id, cancelRequest);
  const balanceRes = await api.getBalance(player.id);

  if (cancelResult.transactionIds.length === 0) {
    throw Error('No transaction to cancel');
  }
  const response = {
    OPERATORID: request.OPERATORID,
    ACCOUNTID: request.ACCOUNTID,
    WALLETTXID: cancelResult.transactionIds[0].toString(),
    CURRENCY: request.CURRENCY,
    BALANCE: asFloat(balanceRes.balance),
  };

  return response;
};

const handler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  logger.debug('ELK request', { body: req.body });
  const request = req.body;

  try {
    const response = {
      RSP: {
        $: {
          action: request.REQ.$.action,
          rc: '0',
          msg: '',
        },
      },
    };

    if (
      request.REQ.PARTNERUID !== configuration.partnerId ||
      request.REQ.PASSWORD !== configuration.password ||
      request.REQ.OPERATORID !== configuration.operatorId
    ) {
      logger.error('ELK authorization failed', { request: req.body, configuration });

      return errorResponse(request, 1, 'Authorization failed', res);
    }

    switch (request.REQ.$.action) {
      case 'getaccount':
        response.RSP = { ...response.RSP, ...(await getAccount(request.REQ)) };
        break;
      case 'getbalance':
        response.RSP = { ...response.RSP, ...(await getBalance(request.REQ)) };
        break;
      case 'wager':
        response.RSP = { ...response.RSP, ...(await wager(request.REQ)) };
        break;
      case 'result':
        {
          const player = getPlayerId(request.REQ.ACCOUNTID);
          const transactions = await api.getRoundTransactions(player.id, {
            gameRoundId: request.REQ.ROUNDID,
            manufacturer: MANUFACTURER_ID,
            timestamp: new Date(),
          });

          if (transactions.filter((t) => t.type === 'cancel_bet').length > 0) {
            return errorResponse(request, 1, 'Transaction already cancelled', res);
          }

          response.RSP = { ...response.RSP, ...(await result(request.REQ)) };
        }
        break;
      case 'deposit':
        response.RSP = { ...response.RSP, ...(await deposit(request.REQ)) };
        break;
      case 'rollback':
        {
          const player = getPlayerId(request.REQ.ACCOUNTID);
          const transactions = await api.getRoundTransactions(player.id, {
            gameRoundId: request.REQ.ROUNDID,
            manufacturer: MANUFACTURER_ID,
            timestamp: new Date(),
          });

          if (transactions.filter((t) => t.type === 'win').length > 0) {
            return errorResponse(request, 1, 'Transaction already committed', res);
          }

          const transactionToCancel = transactions.filter(
            (t) => t.type === 'bet' && t.externalTransactionId === request.REQ.ROLLBACKTXID,
          );
          if (
            transactionToCancel.length > 0 &&
            transactionToCancel[0].amount !== parseMoney(request.REQ.AMOUNT)
          ) {
            return errorResponse(request, 1, 'Amount mismatch', res);
          }

          const rollbackResult = await rollback(request.REQ);
          if (rollbackResult.OPERATORID) {
            response.RSP = { ...response.RSP, ...(rollbackResult) };
          } else {
            return errorResponse(request, 1, 'Missing OPERATORID', res);
          }
        }
        break;
      default:
        return errorResponse(request, 1, 'Not supported action', res);
    }

    res.set('Content-Type', 'text/xml');
    const xmlResponse = builder.buildObject(response);

    logger.debug('ELK response', { response, xmlResponse });
    return res.send(xmlResponse);
  } catch (e) {
    if (e.code === 10004) return errorResponse(request, 1, 'Technical Error', res);
    if (e.code === 10006) return errorResponse(request, 1010, 'Balance too low', res);
    if (e.code === 10008) return errorResponse(request, 1, 'Technical Error', res);
    if (e.code === 10009) return errorResponse(request, 1, 'Technical Error', res);

    if (e.message === 'Currency does not match') {
      return errorResponse(
        {
          REQ: {
            $: {
              action: 'getbalance',
            },
          },
        },
        1,
        'Currency does not match',
        res,
      );
    }

    if (e.message === 'No transaction to cancel') {
      return errorResponse(
        {
          REQ: {
            $: {
              action: 'rollback',
            },
          },
        },
        200,
        'No transaction to cancel',
        res,
      );
    }
    logger.error('ELK request failed', { request: req.body, e });

    return errorResponse(request, 1, 'Technical Error', res);
  }
};

module.exports = {
  handler,
};
