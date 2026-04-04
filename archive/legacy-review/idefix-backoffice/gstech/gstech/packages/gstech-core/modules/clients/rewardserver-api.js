/* @flow */
import type {
  RewardWithGame,
  ImportLedgersData,
  PlayerBalance,
  RewardType,
  RewardGroup,
} from '../types/rewards';

import type {
  GetAllPlayerLedgersResponse,
  GetAvailableRewardsResponse,
  CreditRewardResponse,
  CreditRewardRequest,
  CreditRewardByExternalIdRequest,
  ExchangeRewardResponse,
  GetUnusedLedgersResponse,
  UseLedgerResponse,
  GetPlayerGamesResponse,
  GetPlayerProgressesResponse,
} from './rewardserver-api-types'

const config = require('../config');
const request = require('../request')('rewardserver api', config.api.rewardServer.private);

const doReq = (method: HttpMethod, path: string, body: mixed, headers: mixed = {}): Promise<any> => {
  const token = config.api.rewardServer.authToken;
  return request(method, path, body, { 'X-Token': token, ...headers });
};

const getAllPlayerLedgers = async (
  playerId: Id,
  query: {
    brandId?: BrandId,
    pageSize?: number,
    pageIndex?: number,
    rewardType?: RewardType,
    group?: RewardGroup,
    externalId?: string,
  },
): Promise<GetAllPlayerLedgersResponse> =>
  doReq('GET', `/players/${playerId}/ledgers`, query);

const getAvailableRewards = async (brandId: BrandId, query: { group?: RewardGroup, rewardType?: RewardType, externalId?: string, excludeDisabled?: boolean }): Promise<GetAvailableRewardsResponse> =>
  doReq('GET', `/${brandId}/rewards/available`, query)

const getRewardInfo = async (rewardId: Id): Promise<RewardWithGame> =>
  doReq('GET', `/rewards/${rewardId}`);

const creditReward = async (brandId: BrandId, rewardId: Id, { userId, ...body }: CreditRewardRequest): Promise<CreditRewardResponse> =>
  doReq('POST', `/${brandId}/rewards/${rewardId}/credit`, body, userId ? { 'x-userid': userId } : null);

const creditRewardByExternalId = async (brandId: BrandId, { userId, ...body }: CreditRewardByExternalIdRequest): Promise<CreditRewardResponse> =>
  doReq('POST', `/${brandId}/rewards/credit`, body, userId ? { 'x-userid': userId } : null);

const exchangeReward = async (brandId: BrandId, rewardId: Id, playerId: Id): Promise<ExchangeRewardResponse> =>
  doReq('POST', `/${brandId}/rewards/${rewardId}/exchange`, { playerId });

const getUnusedLedgers = async (brandId: BrandId, playerId: Id, query: { rewardType?: RewardType, group?: RewardGroup }): Promise<GetUnusedLedgersResponse> =>
  doReq('GET', `/${brandId}/ledgers`, { playerId, ...query });

const useLedger = async (brandId: BrandId, ledgerId: Id, playerId: Id): Promise<UseLedgerResponse> =>
  doReq('POST', `/${brandId}/ledgers/${ledgerId}/use`, { playerId });

const useWheelSpin = async (brandId: BrandId, playerId: Id): Promise<ExchangeRewardResponse> =>
  doReq('POST', `/${brandId}/ledgers/use-wheel`, { playerId });

const getGames = async (brandId: BrandId): Promise<GetPlayerGamesResponse> =>
  doReq('GET', `/${brandId}/games`);

const getPlayerGames = async (brandId: Id, playerId: Id): Promise<GetPlayerGamesResponse> =>
  doReq('GET', `/${brandId}/games`, {player: playerId});

const getPlayerProgresses = async (brandId: BrandId, playerId: Id): Promise<GetPlayerProgressesResponse> =>
  doReq('GET', `/${brandId}/progresses`, { playerId, includeBalances: true });

const getBalances = async (brandId: BrandId, playerId: Id): Promise<PlayerBalance> =>
  doReq('GET', `/${brandId}/players/${playerId}/balance`);

const importLedgers = async (brandId: BrandId, playerId: Id, ledgers: ImportLedgersData): Promise<OkResult> =>
  doReq('POST', `/${brandId}/ledgers/import`, { playerId, ledgers });

const markLedgerGroupUsed = async (playerId: Id, groupId: Id, userId?: Id): Promise<OkResult> =>
  doReq('PUT', `/players/${playerId}/ledgers/mark-used`, { groupId }, userId ? { 'x-userid': userId } : null);

module.exports = {
  getAllPlayerLedgers,
  getAvailableRewards,
  getRewardInfo,
  getBalances,
  getUnusedLedgers,
  useLedger,
  useWheelSpin,
  creditReward,
  creditRewardByExternalId,
  getGames,
  getPlayerGames,
  getPlayerProgresses,
  exchangeReward,
  importLedgers,
  markLedgerGroupUsed,
};
