/* @flow */
import type {
  GiveBonusResponse,
  CreditBonusResponse,
  CreditFreeSpinsRequest,
  CreditFreeSpinsResponse,
  ReportFraudResponse,
  CreateTransactionResponse,
  PlayerUpdateDetailsDraft,
  PlayerUpdateDetailsResponse,
} from './backend-api-types';

const config = require('../config');
const request = require('../request')('backend bonus api', config.api.backend.url);

const doReq = (brandId: BrandId, playerId: Id, method: HttpMethod, path: string, body: mixed): Promise<any> => {
  const token = config.api.backend.staticTokens[brandId];
  return request(method, `/api/${brandId}/v1/${path}`, body, { Authorization: `Beerer ${playerId}`, 'X-Token': token });
};

// TODO: this guy belongs to backend game api
const creditGameFreeSpins = async (
  brandId: BrandId,
  playerId: Id,
  body: CreditFreeSpinsRequest,
): Promise<CreditFreeSpinsResponse> => doReq(brandId, playerId, 'POST', `creditfreespins`, body);

  // TODO: this guy belongs to backend payment api
const createTransaction = async (brandId: BrandId, playerId: Id, body: { amount: Money, transactionType: 'correction' | 'compensation', reason: string }): Promise<CreateTransactionResponse> =>
  doReq(brandId, playerId, 'POST', 'transaction', body);

const creditBonus = async (brandId: BrandId, playerId: Id, bonusCode: string): Promise<CreditBonusResponse> =>
  doReq(brandId, playerId, 'POST', `bonuses/${bonusCode}/credit`);

const giveBonus = async (brandId: BrandId, playerId: Id, bonusCode: string): Promise<GiveBonusResponse> =>
  doReq(brandId, playerId, 'POST', `bonuses/${bonusCode}/give`);

const reportFraud = async (brandId: BrandId, playerId: Id, body: { username: string, fraudKey: string, fraudId: string, details?: Object}): Promise<ReportFraudResponse> =>
  doReq(brandId, playerId, 'POST', 'report-fraud', body);

const updatePlayerDetails = async (brandId: BrandId, playerId: Id, body: PlayerUpdateDetailsDraft): Promise<PlayerUpdateDetailsResponse> =>
  doReq(brandId, playerId, 'POST', 'details', body);

module.exports = {
  creditGameFreeSpins,
  createTransaction,
  creditBonus,
  giveBonus,
  reportFraud,
  updatePlayerDetails,
};
