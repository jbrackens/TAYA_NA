/* @flow */
import type {
  HabaneroMoney,
  PlayerDetailRequest,
  PlayerDetailResponse,
  QueryRequest,
  FundTransferRequest,
  FundTransferResponse,

} from './types';

const first = require('lodash/fp/first');
const tail = require('lodash/fp/tail');
const find = require('lodash/fp/find');
const { v1: uuid } = require('uuid');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const logger = require('gstech-core/modules/logger');
const { MANUFACTURER_ID } = require('./constants');
const localizations = require('../localizations');

const formatMoney = (amount: Money): HabaneroMoney => Number(amount / 100);
const parseMoney = (amount: HabaneroMoney): Money => Number(amount) * 100;

const getPlayerId = async (
  playerid: string,
  token: string,
): Promise<{ playerId: Id, brandId: BrandId }> => {
  try {
    const { player, sessions } = await api.getPlayerBySession(MANUFACTURER_ID, token);
    if (!sessions.some(({ type, sessionId }) => type === 'internal' && sessionId === token)) {
      return Promise.reject({ success: false, autherror: true, message: 'Invalid session' });
    }
    return { playerId: player.id, brandId: player.brandId };
  } catch (e) {
    return Promise.reject({ success: false, autherror: true, message: 'Session is not active' });
  }
};

const playerdetailrequest = async (request: PlayerDetailRequest): Promise<PlayerDetailResponse | null> => {
  try {
    const { player, sessions } = await api.getPlayerBySession(MANUFACTURER_ID, request.playerdetailrequest.token);
    if (player != null) {
      let newtoken: ?string;
      if (request.playerdetailrequest.gamelaunch) {
        const session = find<{ type: string, sessionId: string, ... }>(({ type }) => type === 'internal')(sessions);
        const ticket = find<{ type: string, sessionId: string, ... }>(({ type }) => type === 'ticket')(sessions);
        if (ticket == null) {
          return Promise.reject({ success: false, autherror: true, message: 'Invalid token' });
        }
        // Initial ticket, replace with permanent ticket
        if (session == null) {
          const sessionId = uuid();
          await api.createPlayerSession(ticket.sessionId, MANUFACTURER_ID, 'internal', sessionId);
          newtoken = sessionId;
        } else {
          newtoken = session.sessionId;
        }
      }

      const result: any = {
        playerdetailresponse: {
          status: {
            success: true,
            autherror: false,
          },
          accountid: `${player.brandId}_${player.id}`,
          accountname: api.nickName(player),
          balance: formatMoney(player.balance),
          currencycode: player.currencyId,
          segmentkey: player.brandId,
        },
      };
      if (newtoken) {
        result.playerdetailresponse.newtoken = newtoken;
      }
      return result;
    }
    return null;
  } catch (e) {
    return Promise.reject({
      autherror: true,
      success: false,
    });
  }
};

const fundTransferRequest = async (request: FundTransferRequest): Promise<FundTransferResponse> => {
  const { fundtransferrequest } = request;
  const { funds, token, gamedetails } = fundtransferrequest;
  const { brandId, playerId } = await getPlayerId(fundtransferrequest.accountid, token);
  const mainOp = first(funds.fundinfo);
  const restOp = tail(funds.fundinfo);
  const betAmount = parseMoney(mainOp.amount);
  const closeRound = funds.fundinfo.some(x => x.gamestatemode === 2 || x.gamestatemode === 3);
  let successcredit = false;
  let successdebit = false;
  let endBalance;
  let endCurrencyId;
  const hasBet = funds.debitandcredit || betAmount < 0;
  try {
    if (hasBet) {
      const bet = {
        brandId,
        manufacturer: MANUFACTURER_ID,
        game: gamedetails.keyname,
        closeRound,
        sessionId: token,
        gameRoundId: mainOp.initialdebittransferid,
        transactionId: mainOp.transferid,
        timestamp: new Date(mainOp.dtevent),
        amount: -betAmount,
        wins: undefined,
      };
      const { currencyId, balance } = await api.bet(playerId, bet);
      successdebit = true;
      endBalance = balance;
      endCurrencyId = currencyId;
    }
    const winData = hasBet ? restOp : funds.fundinfo;
    if (winData.length > 0) {
      const wins = winData.map(({ amount, jpwin, isbonus }) => ({ type: jpwin ? 'jackpot' : (isbonus ? 'freespins' : 'win'), amount: parseMoney(amount) })); // eslint-disable-line
      const win = {
        brandId,
        manufacturer: MANUFACTURER_ID,
        game: gamedetails.keyname,
        closeRound,
        sessionId: token,
        gameRoundId: mainOp.initialdebittransferid,
        transactionId: winData[0].transferid,
        timestamp: new Date(winData[0].dtevent),
        wins,
      };
      const { currencyId, balance } = await api.win(playerId, win);
      endBalance = balance;
      endCurrencyId = currencyId;
      successcredit = true;
    }

    if (endBalance == null || endCurrencyId == null) {
      throw new Error('Invalid transaction state');
    }

    return {
      fundtransferresponse: {
        balance: formatMoney(endBalance),
        currencycode: endCurrencyId,
        status: {
          success: true,
          successdebit: funds.debitandcredit ? successdebit : undefined,
          successcredit: funds.debitandcredit ? successcredit : undefined,
        },
      },
    };
  } catch (e) {
    if (e.code && e.code === 10002) { // Not enough balance
      return { fundtransferresponse: { status: { success: false, autherror: true, successdebit, successcredit } } };
    }

    if (e.code && e.code === 10004) { // Session expired
      return { fundtransferresponse: { status: { success: false, autherror: true, successdebit, successcredit } } };
    }

    const { currencyId, balance } = await api.getBalance(playerId);
    if (e.code && e.code === 10006) { // Not enough balance
      return {
        fundtransferresponse: {
          status: { success: false, nofunds: true, successdebit, successcredit },
          balance: formatMoney(balance),
          currencycode: currencyId,
        },
      };
    }
    if (e.code && e.code === 10008) { // Limit exceeded
      return {
        fundtransferresponse: {
          status: {
            success: false,
            nofunds: false,
            message: localizations.get(request.auth.locale, 'limit'),
            successdebit,
            successcredit,
          },
          balance: formatMoney(balance),
          currencycode: currencyId,
        },
        dialogmessageresponse: {
          message: localizations.get(request.auth.locale, 'limit'),
          type: 3,
        },
      };
    }
    if (e.code && e.code === 10009) { // Game play blocked
      return {
        fundtransferresponse: {
          status: {
            success: false,
            nofunds: false,
            message: localizations.get(request.auth.locale, 'locked'),
            successdebit,
            successcredit,
          },
          balance: formatMoney(balance),
          currencycode: currencyId,
        },
        dialogmessageresponse: {
          message: localizations.get(request.auth.locale, 'locked'),
          type: 3,
        },
      };
    }
    logger.warn('Unhandled exception!', e);
    return Promise.reject(e);
  }
};

const queryrequest = async (request: QueryRequest): Promise<FundTransferResponse> => {
  const { brandId, playerId } = await getPlayerId(request.queryrequest.accountid, request.queryrequest.token);
  const tx = await api.getTransaction(playerId, {
    brandId,
    transactionId: request.queryrequest.transferid,
    manufacturer: MANUFACTURER_ID,
    timestamp: new Date(),
  });
  return {
    fundtransferresponse: {
      status: {
        success: tx.some(({ type, amount, bonusAmount }) => type === 'win' && (bonusAmount + amount) === parseMoney(request.queryrequest.queryamount)),
      },
    },
  };
};

module.exports = {
  playerdetailrequest,
  fundtransferrequest: fundTransferRequest,
  queryrequest,
};
