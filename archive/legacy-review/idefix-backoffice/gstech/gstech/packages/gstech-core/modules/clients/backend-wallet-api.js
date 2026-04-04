/* @flow */
import type { GameProvider } from '../constants';
import type { Player } from '../types/player';

const logger = require('../logger');
const config = require('../config');
const errors = require('../errors/wallet-error-codes');
const { axios } = require('../axios');

export type BalanceResult = {
  balance: Money,
  bonusBalance: Money,
  realBalance: Money,
  currencyId: string,
};

export type PlayerWithBalance = {
  ...Player,
  ...BalanceResult,
}

export type GameRoundResultType = 'bet' | 'win' | 'win_jackpot' | 'win_local_jackpot' | 'win_freespins';

export type GameRoundOp = {
  transactionId: Id,
  amount?: Money,
  balance: Money,
  realBalance: Money,
  bonusBalance: Money,
  type: GameRoundResultType,
};
export type GameRoundResult = {
  transactionId: Id,
  gameRoundId: Id,
  usedBonusBalance: boolean,
  ops?: GameRoundOp[],
  existingTransaction?: boolean,
} & BalanceResult;

export type SessionResult = {
  sessionId: string,
  type: string,
  parameters: any,
  manufacturerId: string,
};

export type Win = {
  type: 'win' | 'freespins' | 'jackpot' | 'pooled_jackpot',
  amount: Money,
  transactionId?: string,
}

export type BetRequest = {
  game: string,
  useGameId?: boolean,
  closeRound: boolean,
  brandId: string,
  manufacturer: GameProvider,
  sessionId: ?string,
  amount: Money,
  gameRoundId: string,
  transactionId: string,
  timestamp: Date,
  wins: ?Win[],
  currencyId?: string,
  createGameRound?: boolean,
};

export type WinRequest = {
  game: string,
  useGameId?: boolean,
  wins: Win[],
  brandId: string,
  closeRound: boolean,
  manufacturer: GameProvider,
  sessionId: ?string,
  gameRoundId: string,
  transactionId: string,
  timestamp: Date,
  currencyId?: string,
  createGameRound?: boolean,
};

export type CloseRoundRequest = {
  brandId: string,
  manufacturer: GameProvider,
  gameRoundId: string,
  timestamp: Date,
};

export type GetTransactionRequest = {
  brandId: string,
  manufacturer: GameProvider,
  gameRoundId?: string,
  transactionId: string,
  timestamp: Date,
};

export type CancelTransactionRequest = {
  manufacturer: GameProvider,
  brandId: string,
  amount?: Money,
  gameRoundId?: string,
  transactionId: string,
  cancelTransactionId?: string,
  timestamp: Date,
  currencyId?: string,
};

const nickName = (player: { firstName: string, lastName: string, ... }): string =>
  `${player.firstName} ${player.lastName.substring(0, 1)}`;

const doReq = async (
  method: HttpMethod,
  path: string,
  body: mixed = {},
  headers?: { [key: string]: mixed } = {},
): Promise<any> => {
  try {
    const uri = `${config.api.backend.walletUrl}${path}`;
    logger.debug(`>>>>> ${method} ${path}`, { uri, method, body, headers });
    const options = {
      method,
      url: uri,
      [((method === 'GET' ? 'params' : 'data'): string)]: body,
      headers,
    };
    const { data: response } = await axios.request(options);


    logger.debug(`<<<<< ${method} ${path}`, { uri, response });
    return response;
  } catch (err) {
    const { cause, code, error: e } = err;
    logger.error('XXXXX backend-wallet-api doReq', { code, cause, error: e });
    if (e.statusCode === 404) return Promise.reject(e || 'Not found');
    if (e && e.code) return Promise.reject(e);
    if (cause && cause.code === 'ECONNREFUSED') return Promise.reject('ECONNREFUSED');
    if (cause && cause.code === 'ENOTFOUND') {
      logger.error('ENOTFOUND error from API. Exiting.', { e, code, cause });
      process.exit();
    }
    if (e && e.code) return Promise.reject({ code: e.code, message: e.message });
    return Promise.reject(err);
  }
};

const bet = (playerId: Id, body: BetRequest): Promise<GameRoundResult> =>
  doReq('POST', `/player/${playerId}/bet`, body);

const win = (playerId: Id, body: WinRequest): Promise<GameRoundResult> =>
  doReq('POST', `/player/${playerId}/win`, body);

const closeRound = (playerId: Id, body: CloseRoundRequest): Promise<GameRoundResult> =>
  doReq('POST', `/player/${playerId}/close`, body);

const getTransaction = (playerId: Id, body: GetTransactionRequest): Promise<{ type: GameRoundResultType, amount: Money, bonusAmount: Money }[]> =>
  doReq('GET', `/player/${playerId}/transactions`, body);

const getRoundTransactions = (playerId: Id, body: { manufacturer: GameProvider, gameRoundId: string, timestamp: Date }): Promise<{ transactionId: Id, externalTransactionId: string, type: GameRoundResultType, amount: Money, bonusAmount: Money }[]> =>
  doReq('GET', `/player/${playerId}/round`, body);

const cancelTransaction = (playerId: Id, body: CancelTransactionRequest): Promise<{ transactionIds: Id[], transactionFound: boolean, alreadyCancelled: boolean, invalidTransaction: boolean }> =>
  doReq('DELETE', `/player/${playerId}/transactions`, body);

const getPlayer = async (playerId: Id): Promise<PlayerWithBalance> =>
  doReq('GET', `/player/${playerId}`, {});

const getPlayerBySession = async (manufacturer: GameProvider, sessionId: string): Promise<{ player: PlayerWithBalance, sessions: SessionResult[] }> =>
  doReq('GET', `/session/${manufacturer}/${sessionId}`, {});

const getBalance = async (playerId: Id): Promise<BalanceResult> =>
  doReq('GET', `/player/${playerId}/balance`, {});

const createManufacturerSession = async (sessionId: Id, manufacturer: GameProvider, type: string, id: string, parameters: mixed = {}, playerId: Id): Promise<{}> =>
  doReq('POST', `/session/${manufacturer}/${type}`, { id, parameters, playerId, sessionId });

const createPlayerSession = async (sessionId: string, manufacturer: GameProvider, type: string, id: string, parameters: mixed = {}): Promise<{}> =>
  doReq('POST', `/session/${manufacturer}/${sessionId}/${type}`, { id, parameters });

const expirePlayerSession = async (sessionId: string, manufacturer: GameProvider): Promise<{}> =>
  doReq('DELETE', `/session/${manufacturer}/${sessionId}`, {});

const updatePlayerSession = async (sessionId: string, manufacturer: GameProvider, parameters: mixed = {}): Promise<{}> =>
  doReq('PUT', `/session/${manufacturer}/${sessionId}`, parameters);

const createOrUpdateTicket = async (externalTicketId: string, content: Object): Promise<{}> =>
  doReq('PUT', `/ticket`, { externalTicketId, content });

const getPlayerId = async (username: string): Promise<{ playerId: Id, brandId: BrandId }> => {
  const [bid,, id] = username.split('_');
  const brandId: any = bid;
  const playerId = Number(id);
  if (isNaN(playerId)) {
    throw new Error(`Player id is not a number. ${playerId}`);
  }

  if (playerId >= 3000000) { // Return values for non-migrated players
    return { playerId, brandId };
  }

  const response = await doReq('GET', `/player/id/${brandId}/${username}`);

  return { playerId: response.id, brandId: response.brandId };
};

module.exports = {
  bet,
  win,
  cancelTransaction,
  getPlayer,
  getBalance,
  closeRound,
  nickName,
  getPlayerBySession,
  createManufacturerSession,
  createPlayerSession,
  expirePlayerSession,
  updatePlayerSession,
  getPlayerId,
  getTransaction,
  getRoundTransactions,
  createOrUpdateTicket,
  errors,
};
