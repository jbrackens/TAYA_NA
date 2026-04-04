/* @flow */
const config = require('../config');
const request = require('../request')('rewardserver api', config.api.rewardServer.private);

const getAvailableRewards = async (brandId: BrandId, rewardType: RewardType): Promise<DataResponse<GetAvailableRewardsResponse>> =>
  request('GET', `/${brandId}/rewards/available?rewardType=${rewardType}`);

const creditReward = async (brandId: BrandId, rewardId: Id, creditRewardRequest: CreditRewardRequest): Promise<DataResponse<CreditRewardResponse>> =>
  request('POST', `/${brandId}/rewards/${rewardId}/credit`, creditRewardRequest);

const exchangeReward = async (brandId: BrandId, rewardId: Id, playerId: Id): Promise<DataResponse<ExchangeRewardResponse>> =>
  request('POST', `/${brandId}/rewards/${rewardId}/exchange`, { playerId });

const getUnusedLedgers = async (brandId: BrandId, playerId: Id, rewardType: RewardType): Promise<DataResponse<GetUnusedLedgersResponse>> =>
  request('GET', `/${brandId}/ledgers?playerId=${playerId}&rewardType=${rewardType}`);

const useLedger = async (brandId: BrandId, ledgerId: Id, playerId: Id): Promise<DataResponse<UseLedgerResponse>> =>
  request('POST', `/${brandId}/ledgers/${ledgerId}/use`, { playerId });

const getPlayersProgress = async (brandId: BrandId, playerId: Id): Promise<DataResponse<GetPlayersProgressResponse>> =>
  request('GET', `/${brandId}/progresses?playerId=${playerId}`);

module.exports = {
  getAvailableRewards,
  getUnusedLedgers,
  useLedger,
  creditReward,
  getPlayersProgress,
  exchangeReward,
};
