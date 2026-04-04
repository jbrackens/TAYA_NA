/* @flow */
import type { GameTypes, DrawingDetails, DrawingSchedules, PayoutTable, BetRequest, BetResponse, TicketDetails } from './types';

const { axios } = require('gstech-core/modules/axios');
const config = require('../config');

const getGametypes = async (): Promise<GameTypes> => {
  const { data: result } = await axios.request({
    url: `${config.providers.lottoWarehouse.url}/gametypes/list`,
    auth: {
      username: config.providers.lottoWarehouse.userid,
      password: config.providers.lottoWarehouse.password,
    },
  });

  if (!result.data) throw Error(result.message);

  return result.data;
};

const getDrawingDetails = async (drawId: number): Promise<DrawingDetails> => {
  const { data: result } = await axios.request({
    url: `${config.providers.lottoWarehouse.url}/drawings/details/${drawId}`,
    auth: {
      username: config.providers.lottoWarehouse.userid,
      password: config.providers.lottoWarehouse.password,
    },
  });

  if (!result.data) throw Error(result.message);

  return result.data;
};

const getDrawingSchedules = async (): Promise<DrawingSchedules> => {
  const { data: result } = await axios.request({
    url: `${config.providers.lottoWarehouse.url}/drawing-schedules/list`,
    auth: {
      username: config.providers.lottoWarehouse.userid,
      password: config.providers.lottoWarehouse.password,
    },
  });

  if (!result.data) throw Error(result.message);

  return result.data;
};

const getPayoutTable = async (drawId: number): Promise<PayoutTable> => {
  const { data: result } = await axios.request({
    url: `${config.providers.lottoWarehouse.url}/drawings/payout-table/${drawId}`,
    auth: {
      username: config.providers.lottoWarehouse.userid,
      password: config.providers.lottoWarehouse.password,
    },
  });

  if (!result.data) throw Error(result.message);

  return result.data;
};

const createBet = async (betRequest: BetRequest): Promise<BetResponse> => {
  const { data: result } = await axios.request({
    method: 'POST',
    url: `${config.providers.lottoWarehouse.url}/bets/create`,
    auth: {
      username: config.providers.lottoWarehouse.userid,
      password: config.providers.lottoWarehouse.password,
    },
    data: betRequest,
  });

  if (!result.data) throw Error(result.message);

  return result.data;
};

const getTicketDetails = async (externalid: string): Promise<TicketDetails> => {
  const { data: result } = await axios.request({
    url: `${config.providers.lottoWarehouse.url}/ticket/${externalid}`,
    auth: {
      username: config.providers.lottoWarehouse.userid,
      password: config.providers.lottoWarehouse.password,
    },
  });

  if (!result.data) throw Error(result.message);

  return result.data;
};

module.exports = {
  getGametypes,
  getDrawingDetails,
  getDrawingSchedules,
  getPayoutTable,
  createBet,
  getTicketDetails,
};
