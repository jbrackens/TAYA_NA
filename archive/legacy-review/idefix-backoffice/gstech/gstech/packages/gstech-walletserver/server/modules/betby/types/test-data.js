/* @flow */

import type { BetbyBetCommitRequest, BetbyBetDiscardRequest, BetbyBetLostRequest, BetbyBetMakeRequest, BetbyBetRefundRequest, BetbyBetRollbackRequest, BetbyBetSettlementRequest, BetbyBetWinRequest } from './types';

const { DateTime } = require('luxon');
const jwt = require('jsonwebtoken');
// const { BetbyBetMakeRequest } = require('./types');

const getBetMakeRequest= (playerId: string, sid: string, amount: number, betbyTransactionId: string, betslipId: string): BetbyBetMakeRequest => {
  const req: BetbyBetMakeRequest = {
    'amount': amount,
    'currency': 'EUR',
    'player_id': playerId,
    'session_id': sid,
    'bonus_id': 1664976298830860288,
    'bonus_type': 'comboboost',
    'transaction':
      {
        'id': betbyTransactionId,
        'betslip_id': betslipId,
        'player_id': '1659299365132570624',
        'operator_id': '1657013002915142201',
        'operator_brand_id': '1653815133341880320',
        'ext_player_id': playerId,
        'timestamp': 1538654560.2354896,
        'amount': amount,
        'currency': 'EUR',
        'cross_rate_euro': '0.893598',
        'operation': 'bet',
        'bonus_id': '1664976298830860288', // TODO Ask Maxim about type (string or number)
      },
    'betslip':
      {
        'id': betslipId,
        'timestamp': 1538654560.2215934,
        'player_id': '1659299365132570624',
        'operator_id': '1657013002915142201',
        'operator_brand_id': '1653815133341880320',
        'ext_player_id': '1659297400285696000',
        'currency': 'EUR',
        'type': '3/3',
        'sum': 100,
        'k': '4.976244',
        'is_quick_bet': false,
        'bets': [
          {
            'id': '1930003288330211328',
            'event_id': '1924084499931602944',
            'sport_id': '1',
            'tournament_id': '1747263746797084672',
            'category_id': '1746213762093944832',
            'live': false,
            'sport_name': 'Soccer',
            'category_name': 'Poland',
            'tournament_name': 'Ekstraklasa',
            'competitor_name': [
              'Podbeskidzie Bielsko-Biała',
              'Warta Poznan',
            ],
            'market_name': '1x2',
            'outcome_name': 'draw',
            'scheduled': 1603123200,
            'odds': '2.17',
          },
          {
            'id': '1930003288330211329',
            'event_id': '1928581167129432064',
            'sport_id': '1',
            'tournament_id': '1766114650031788032',
            'category_id': '1747967054251696128',
            'live': false,
            'sport_name': 'Soccer',
            'category_name': 'Netherlands',
            'tournament_name': 'Eerste Divisie',
            'competitor_name': [
              'Jong Ajax Amsterdam',
              'Jong FC Utrecht',
            ],
            'market_name': '1x2',
            'outcome_name': 'Jong Ajax Amsterdam',
            'scheduled': 1603125900,
            'odds': '1.56',
          },
          {
            'id': '1930003288330211330',
            'event_id': '1928899513104338944',
            'sport_id': '1',
            'tournament_id': '1775411510860980224',
            'category_id': '1774536583266050048',
            'live': false,
            'sport_name': 'Soccer',
            'category_name': 'Qatar',
            'tournament_name': 'Stars League',
            'competitor_name': [
              'Al Rayyan SC',
              'AL Wakrah',
            ],
            'market_name': '1x2',
            'outcome_name': 'Al Rayyan SC',
            'scheduled': 1603125900,
            'odds': '1.47',
          },
        ],
      },
    'potential_win': 498,
    'potential_comboboost_win': 99,
  };
  return req;
};

const getBetCommitRequest = (transactionId: string): BetbyBetCommitRequest => {
  const req: BetbyBetCommitRequest = {
    'bet_transaction_id': transactionId,
  };
  return req;
};

const getBetSettlementRequest = (transactionId: string): BetbyBetSettlementRequest => {
  const req: BetbyBetSettlementRequest = {
    'status': 'lost',
    'bet_transaction_id': transactionId,
  };
  return req;
};

const getBetRefundRequest = (playerId: string, transactionId: string, betbyTransactionId: string, amount: number, betslipId: string): BetbyBetRefundRequest => {
  const req: BetbyBetRefundRequest = {
    'bet_transaction_id': transactionId,
    'reason': 'Some reason...',
    'bonus_id': '1664976298830860288',
    'transaction':
      {
        'id': betbyTransactionId,
        'betslip_id': betslipId,
        'player_id': '12345',
        'operator_id': '1657013002915142201',
        'operator_brand_id': '1653815133341880320',
        'ext_player_id': playerId,
        'timestamp': 1538654560.2354896,
        'amount': amount,
        'currency': 'EUR',
        'cross_rate_euro': '0.893598',
        'operation': 'refund',
        'bonus_id': '1664976298830860288',
      },
  };
  return req;
};

const getBetWinRequest = (playerId: string,transactionId: string, betbyTransactionId: string, winAmount: number, betslipId: string): BetbyBetWinRequest => {
  const req: BetbyBetWinRequest = {
    'amount': winAmount,
    'currency': 'EUR',
    'is_cashout': false,
    'bet_transaction_id': transactionId,
    'transaction':
      {
        'id': betbyTransactionId,
        'betslip_id': betslipId,
        'player_id': '12345',
        'operator_id': '1657013002915142201',
        'operator_brand_id': '1653815133341880320',
        'ext_player_id': playerId,
        'timestamp': 1538654560.2354896,
        'amount': 1000,
        'currency': 'EUR',
        'operation': 'win',
        'bonus_id': '1664976298830860288',
        'cross_rate_euro': '0.85114',
      },
    'is_snr_lost': true,
    'selections': [
      {
        'id': '1816145097335640064',
        'event_id': '1811927232076193792',
        'status': 'won',
        'odds': '4.5',
      },
      {
        'id': '1816145097335640065',
        'event_id': '1811927287738802176',
        'status': 'won',
        'odds': '1.2',
      },
      {
        'id': '1816145097335640066',
        'event_id': '1811957019113033728',
        'status': 'won',
        'odds': '2.1',
      },
    ],
    'odds': '11.34',
    'bonus_id': '1664976298830860288',
    'bonus_type': 'global_comboboost',
    'comboboost_multiplier': '1.1',
  };
  return req;
};

const getBetLostRequest = (playerId: string,transactionId: string, betbyTransactionId: string, lostAmount: number, betslipId: string): BetbyBetLostRequest => {
  const req: BetbyBetLostRequest = {
    'bet_transaction_id': transactionId,
    'amount': 0,
    'currency': 'USD',
    'transaction': {
      'id': betbyTransactionId,
      'betslip_id': betslipId,
      'player_id': '1659299365132570624',
      'operator_id': '1657013002915142201',
      'operator_brand_id': '1653815133341880320',
      'ext_player_id': playerId,
      'amount': lostAmount, // need to be 0
      'currency': 'USD',
      'cross_rate_euro': '0.893598',
      'operation': 'lost',
      'bonus_id': '1664976298830860288',
      'timestamp': 1575977241.447,
    },
    'selections': [
      {
        'id': '1816145097335640064',
        'event_id': '1811927232076193792',
        'status': 'lost',
      },
      {
        'id': '1816145097335640065',
        'event_id': '1811927287738802176',
        'status': 'won',
      },
      {
        'id': '1816145097335640066',
        'event_id': '1811957019113033728',
        'status': 'open',
      },
    ],
  };
  return req;
};

const getBetDiscardRequest = (playerId: string, betbyTransactionId: string): BetbyBetDiscardRequest => {
  const req: BetbyBetDiscardRequest = {
    'ext_player_id': playerId,
    'transaction_id': betbyTransactionId,
    'reason': 'Lost connection',
  };
  return req;
};

const getBetRollbackRequest = (playerId: string,  transactionId: string, parentTransactionId: string, amount: number): BetbyBetRollbackRequest => {
  const req: BetbyBetRollbackRequest = {
    'bet_transaction_id': transactionId,
    'parent_transaction_id': parentTransactionId,
    'transaction':
      {
        'id': '1265023428769484821',
        'betslip_id': '1234567',
        'player_id': '1659299365132570624',
        'operator_id': '1657013002915142201',
        'operator_brand_id': '1653815133341880320',
        'ext_player_id': playerId,
        'timestamp': 1538654560.2354896,
        'amount': amount,
        'currency': 'USD',
        'cross_rate_euro': '0.893598',
        'operation': 'rollback',
        'bonus_id': '1664976298830860288',
      },
  };
  return req;
};


const publicKey: string = '-----BEGIN PUBLIC KEY-----\n' +
  'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA50vyUfrHbkFnmUTDxhG6\n' +
  '6GWGWhiQG/1YbqOmc4rGatq4CnPjS6Pzh+bfg1mPdBGXXhHmZB4jJ3w4MSjChsW5\n' +
  'olD1okQECyzbCQrw3v5TqnHGEvsD0xNVQqRQsyvOIx5Gm7iylFgYPKjcTiovj+fe\n' +
  'JhMD+aGEuAy49Pt9Ekccqh8s8/Z0hWmOmnpyudGse25AI1NhUximLBBClp/mlbgG\n' +
  'SQG/01AoYGsvIFmI9CTxayj4J8wRv6pSU8oXmYYGcS9IyRn6U8KC5HXC+SqV79am\n' +
  'jH+atHc0HiGy6e+I6uHE4w1hDWlHYXgebItlXjTG4l4ol4E7+YgUm5Q2whokZlbv\n' +
  'nPDGZEm4k86lZ+UodNxiw+N8Y9nGFvnmf4vHxk1hGBTOe+fZH5qCsZszprUKkn9H\n' +
  'x2Co2PTi47K8/5zjl7FqXfUyxVJlN36tRzH1JGbYwig87rrS4u9KrkoX0VXz7aTC\n' +
  'I0jD4X1sst7TY6JgjOFMGDfTLdmqWmuUuUQzOEPbHYq48BOJc3RlyY6SdSGcrsYL\n' +
  'iLNM16VARy15eAcZdmKDbRKgpEO7MgVcktY6Y3cHg33FPfEEVf3IToPKcAukVUGa\n' +
  '70nZSl4tKdmnPzb84E1Oapy0I+IDs3Pch9viQK+9uh2qxMwrJH+Ij07rCKEEfNzl\n' +
  'e3MOScexQ946zymdPdvdqdMCAwEAAQ==\n' +
  '-----END PUBLIC KEY-----';

const privateKey: string = '-----BEGIN RSA PRIVATE KEY-----\n' +
  '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\n' +
  '-----END RSA PRIVATE KEY-----';

const jwtSign = (obj: any): {payload: string} => {
  const now = DateTime.local().toSeconds();
  const message = {
    // 'nbf': now, // TODO check real nbf
    'iat': now,
    'exp': now + 3600,
    'jti': Math.random().toString(),
    'iss': '2047661139927633920',
    'aud': 'test_brand_id', // SN = 2049164620094119936
    'payload': obj,
  };

  const body = {
    payload: jwt.sign(message, privateKey, { algorithm: 'RS256' }),
  };

  return body;
};

module.exports = {
  privateKey,
  publicKey,
  getBetMakeRequest,
  getBetCommitRequest,
  getBetSettlementRequest,
  getBetRefundRequest,
  getBetWinRequest,
  getBetLostRequest,
  getBetDiscardRequest,
  getBetRollbackRequest,
  jwtSign,
};