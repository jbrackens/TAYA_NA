/* @flow */
import type {
  CampaignInfo,
  Campaign,
  NewVoucherInfo,
  PlayerVoucher,
  CloseReason,
  TableBetAmountsBody,
  CasinoBetAmounts,
  EvolutionJackpotAmounts,
} from './types';

const _ = require('lodash');
const { axios } = require('gstech-core/modules/axios');
const money = require('gstech-core/modules/money');
const logger = require('gstech-core/modules/logger');

const config = require('../../../config');

const ossRequest = async ({
  path,
  body,
  method = 'POST',
  qs = {},
  auth = config.providers.evoOSS,
}: {
  path: string,
  body?: any,
  method?: 'GET' | 'POST' | 'PUT',
  qs?: { [string]: any },
  auth?: typeof config.providers.evoOSS,
}): Promise<any> => {
  logger.debug(`>>>>> EvoOSS ${method} ${path}`, { body });
  try {
    const { data: response } = await axios.request({
      method,
      url: `https://${auth.hostname}/api${path}`,
      params: qs,
      auth: {
        username: auth.casino.key,
        password: (path.startsWith('/jackpot') ? auth.jackpotApi : auth.api).token,
      },
      data: body,
    });
    logger.debug(`<<<<< EvoOSS ${method} ${path}`, { response });
    return response;
  } catch (e) {
    logger.error(`XXXXX EvoOSS ${method} ${path}`, { code: e.code, error: e.error });
    throw e;
  }
};

const createCampaign = async (campaignInfo: CampaignInfo): Promise<Campaign> =>
  ossRequest({ path: '/free-games/v3/campaigns', body: campaignInfo });

const getAllCampaigns = async (): Promise<Campaign[]> =>
  ossRequest({ method: 'GET', path: '/free-games/v3/campaigns' });

const getCampaignById = async (campaignId: UUID): Promise<Campaign> =>
  ossRequest({ method: 'GET', path: `/free-games/v3/campaigns/${campaignId}` });

const updateCampaign = async (
  campaignId: UUID,
  campaignInfo: CampaignInfo,
  version: number,
): Promise<Campaign> =>
  ossRequest({
    method: 'PUT',
    path: `/free-games/v3/campaigns/${campaignId}`,
    body: campaignInfo,
    qs: { version },
  });

const launchCampaign = async (campaignId: UUID): Promise<Campaign> =>
  ossRequest({
    path: `/free-games/v3/campaigns/${campaignId}/launch`,
    method: 'PUT',
  });

const issueVoucher = async (
  campaignId: UUID,
  newVoucherInfo: NewVoucherInfo,
): Promise<PlayerVoucher> =>
  ossRequest({
    path: `/free-games/v3/campaigns/${campaignId}/vouchers/issue-one`,
    body: newVoucherInfo,
  });

const issueVouchers = async (
  campaignId: UUID,
  newVouchersInfo: NewVoucherInfo[],
): Promise<PlayerVoucher[]> =>
  ossRequest({
    path: `/free-games/v3/campaigns/${campaignId}/vouchers/issue-many`,
    body: newVouchersInfo,
  });

const getPlayerVouchers = async (playerId: string): Promise<PlayerVoucher[]> =>
  ossRequest({
    method: 'GET',
    path: `/free-games/v3/players/${playerId}`,
  });

const getCampaignVouchers = async (campaignId: UUID): Promise<PlayerVoucher[]> =>
  ossRequest({
    method: 'GET',
    path: `/free-games/v3/campaigns/${campaignId}/vouchers`,
  });

const getVoucherByCampaignId = async (campaignId: UUID, voucherId: UUID): Promise<PlayerVoucher> =>
  ossRequest({
    method: 'GET',
    path: `/free-games/v3/campaigns/${campaignId}/vouchers/${voucherId}`,
  });

const getVoucherByPlayerId = async (playerId: string, voucherId: UUID): Promise<PlayerVoucher> =>
  ossRequest({
    method: 'GET',
    path: `/free-games/v3/players/${playerId}/vouchers/${voucherId}`,
  });

const closeVoucherByPlayerId = async (
  playerId: string,
  voucherId: UUID,
  reason: CloseReason,
): Promise<PlayerVoucher> =>
  ossRequest({
    method: 'PUT',
    path: `/free-games/v3/players/${playerId}/vouchers/${voucherId}/close`,
    qs: { reason },
  });

const closeVoucherByCampaignId = async (
  campaignId: UUID,
  voucherId: UUID,
  reason: CloseReason,
): Promise<PlayerVoucher> =>
  ossRequest({
    method: 'PUT',
    path: `/free-games/v3/campaigns/${campaignId}/vouchers/${voucherId}/close`,
    qs: { reason },
  });

const getCasinoBetAmounts = async (currency: string, site?: string): Promise<CasinoBetAmounts> =>
  ossRequest({
    method: 'GET',
    path: `/free-games/v3/bet-amounts`,
    qs: { currency, site },
  });

const getTableBetAmounts = async (
  currency: string,
  tableBetAmountsBody: TableBetAmountsBody,
): Promise<number[]> =>
  ossRequest({
    method: 'POST',
    path: `/free-games/v3/tables/bet-amounts`,
    qs: { currency },
    body: tableBetAmountsBody,
  });

const getJackpotAmounts = async (
  jackpotId?: string,
  currency?: string,
): Promise<EvolutionJackpotAmounts[]> =>
  ossRequest({
    method: 'GET',
    path: `/jackpot/v2/jackpot${jackpotId ? `/${jackpotId}` : ''}`,
    qs: { currency },
  });

const resolveTableIdFromVoucher = async (playerId: string, voucherId: UUID): Promise<string> => {
  const { campaignId } = await getVoucherByPlayerId(playerId, voucherId);
  const campaign = await getCampaignById(campaignId);
  if (campaign.payload.info.tableSettings.forAll.$type === 'Non') {
    logger.error('XXXXX EvoOSS resolveTableIdFromVoucher', { playerId, voucherId, campaign });
    throw new Error('Found no tableId in campaign tableSettings');
  }
  if (campaign.payload.info.tableSettings.forAll.tableIds.length > 1) {
    logger.error('XXXXX EvoOSS resolveTableIdFromVoucher', { playerId, voucherId, campaign });
    throw new Error('Found multiple tableIds in campaign tableSettings');
  }
  const {
    payload: {
      info: {
        tableSettings: {
          forAll: { tableIds },
        },
      },
    },
  } = campaign;
  if (tableIds.length === 0)
    logger.error('XXXXX EvoOSS resolveTableIdFromVoucher', { playerId, voucherId, campaign });
  return tableIds[0];
};

const resolveSpinValueCurrency = async (
  tableId: string,
  spinType: string,
  spinValue: ?Money,
  currencyId?: string = 'EUR',
): Promise<number> => {
  let betAmount;
  if (spinValue) betAmount = +money.asFloat(spinValue);
  else
    switch (spinType) {
      case 'ms':
      case 'x10':
      case 'mega':
        betAmount = 1.0;
        break;
      case 'ss':
      case 'x5':
      case 'super':
        betAmount = 0.5;
        break;
      case 'x1':
      case 'normal':
        betAmount = 0.1;
        break;
      default:
        betAmount = 0.1; // normal spins
    }

  const getTableBetAmountsBody = {
    forAll: { tableIds: [tableId], $type: 'ParticularTables' },
    forDesktopOnly: { $type: 'Non' },
    forMobileOnly: { $type: 'Non' },
    sites: { $type: 'All' },
  };
  logger.debug('+++++ EvoOSS resolveSpinValueCurrency', { getTableBetAmountsBody });
  const eurBetAmounts = await getTableBetAmounts('eur', getTableBetAmountsBody);
  if (!_.includes(eurBetAmounts, betAmount))
    betAmount = _.minBy(eurBetAmounts, (evoBetAmount) => Math.abs(evoBetAmount - betAmount));
  if (currencyId !== 'EUR') {
    const playerCurrencyBetAmounts = await getTableBetAmounts(currencyId, getTableBetAmountsBody);
    betAmount = _.zipObject(eurBetAmounts, playerCurrencyBetAmounts)[betAmount];
  }
  return betAmount;
};

module.exports = {
  createCampaign,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
  launchCampaign,
  issueVoucher,
  issueVouchers,
  getPlayerVouchers,
  getCampaignVouchers,
  getVoucherByCampaignId,
  getVoucherByPlayerId,
  closeVoucherByPlayerId,
  closeVoucherByCampaignId,
  getCasinoBetAmounts,
  getTableBetAmounts,
  getJackpotAmounts,
  resolveTableIdFromVoucher,
  resolveSpinValueCurrency,
};
