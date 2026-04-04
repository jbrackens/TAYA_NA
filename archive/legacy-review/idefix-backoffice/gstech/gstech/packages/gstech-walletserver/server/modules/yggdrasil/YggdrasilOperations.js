/* @flow */
import type { Player } from 'gstech-core/modules/types/player';
import type {
  YggdrasilMoney,
  YggdrasilRequest,
  GetBalanceRequest,
  GetBalanceResponse,
  WagerRequest,
  WagerResponse,
  PlayerinfoRequest,
  PlayerinfoResponse,
  CancelWagerRequest,
  CancelWagerResponse,
  CampaignPayoutRequest,
  CampaignPayoutResponse,
  AppendWagerResultRequest,
  AppendWagerResultResponse,
  EndWagerRequest,
  EndWagerResponse,
} from './types';

const api = require('gstech-core/modules/clients/backend-wallet-api');
const { errors } = require('./types');

const config = require('../../../config');

const configuration = config.providers.yggdrasil;
const defaultConfiguration = configuration.environments[0];

const formatMoney = (amount: Money): YggdrasilMoney => (amount / 100).toFixed(2);
const parseMoney = (amount: YggdrasilMoney): Money => Number(amount) * 100;

const getPlayerId = async (
  request: YggdrasilRequest,
): Promise<{ playerId: Id, brandId: BrandId }> => {
  const res = await api.getPlayerId(request.playerid);
  if (res == null) {
    return Promise.reject({ code: errors.NOT_AUTHORIZED, msg: 'Player not found' });
  }
  const { playerId, brandId } = res;
  return { playerId, brandId };
};

const formatPlayerId = (player: { ...Player, ...}) => player.username; // `${player.brandId}${player.id}`;

const getbalance = async (request: GetBalanceRequest): Promise<GetBalanceResponse> => {
  const { playerId, brandId } = await getPlayerId(request);
  const b = await api.getBalance(playerId);
  const player = await api.getPlayer(playerId);
  const { realBalance, bonusBalance, currencyId } = b;
  return {
    organization: configuration.brands[brandId].org,
    playerId: formatPlayerId(player),
    currency: currencyId,
    applicableBonus: formatMoney(bonusBalance),
    balance: formatMoney(realBalance),
    homeCurrency: currencyId,
    nickName: api.nickName(player),
  };
};

/* eslint-disable no-unused-vars */
const wager = async (request: WagerRequest): Promise<WagerResponse> => {
  const { brandId, playerId } = await getPlayerId(request);
  const {
    amount,
    currency,
    reference,
    subreference,
    description,
    prepaidticketid,
    prepaidvalue,
    prepaidcost,
    prepaidref,
    jackpotcontribution,
    lang,
    cat1,
    cat2,
    cat3,
    cat4,
    cat5,
  } = request;
  // CashRace Tournament NetworkTournament NetworkMission Boost

  const wdReq = {
    brandId,
    sessionId: request.sessiontoken,
    manufacturer: defaultConfiguration.manufacturerId,
    closeRound: false,
    amount: parseMoney(amount),
    game: cat5,
    gameRoundId: reference,
    transactionId: subreference || reference,
    timestamp: new Date(),
    wins: undefined,
  };
  try {
    await api.bet(playerId, wdReq);
    const { realBalance, bonusBalance, currencyId } = await api.getBalance(playerId);
    return {
      organization: configuration.brands[brandId].org,
      playerId: request.playerid,
      currency: currencyId,
      applicableBonus: formatMoney(bonusBalance),
      balance: formatMoney(realBalance),
      homeCurrency: currencyId,
      // nickName: api.nickName(player),
    };
  } catch (e) {
    if (e.code && e.code === 10006) {
      return Promise.reject({ code: errors.OVERDRAFT, msg: 'Insufficient balance' });
    }
    if (e.code && e.code === 10008) {
      return Promise.reject({ code: errors.BLOCKED, msg: 'Bet failed because of play limit' });
    }
    if (e.code && e.code === 10009) {
      return Promise.reject({ code: errors.BLOCKED, msg: 'Bet failed because of game play blocked' });
    }
    throw e;
  }
};

const endwager = async (request: EndWagerRequest): Promise<EndWagerResponse> => {
  const { playerId, brandId } = await getPlayerId(request);
  const {
    org,
    playerid,
    amount,
    bonusprize,
    currency,
    tickets,
    service,
    reference,
    subreference,
    description,
    cat1,
    cat2,
    cat3,
    cat4,
    cat5,
    tag1,
    tag2,
    tag3,
    lang,
    version,
    prepaidref,
  } = request;
  const wins = [];
  if (parseMoney(amount) > 0 || parseMoney(bonusprize) === 0) {
    wins.push({ amount: parseMoney(amount), type: 'win' });
  }
  if (parseMoney(bonusprize) > 0) {
    wins.push({ amount: parseMoney(bonusprize), type: 'freespins' });
  }
  const depositReq = {
    brandId,
    wins,
    manufacturer: defaultConfiguration.manufacturerId,
    game: cat5,
    createGameRound: false,
    closeRound: true,
    gameRoundId: reference,
    transactionId: subreference || reference,
    sessionId: request.sessiontoken,
    timestamp: new Date(),
  };
  await api.win(playerId, depositReq);
  const { realBalance, bonusBalance, currencyId } = await api.getBalance(playerId);
  return {
    organization: configuration.brands[brandId].org,
    playerId: request.playerid,
    currency: currencyId,
    applicableBonus: formatMoney(bonusBalance),
    balance: formatMoney(realBalance),
    homeCurrency: currencyId,
  };
};

const campaignpayout = async (request: CampaignPayoutRequest): Promise<CampaignPayoutResponse> => {
  const { playerId, brandId } = await getPlayerId(request);
  const {
    org,
    playerid,
    cash,
    bonus,
    currency,
    reference,
    description,
    cat1,
    cat2,
    cat3,
    cat4,
    cat5,
    tag1,
    tag2,
    tag3,
    campaignref,
    prepaidref,
    last,
    lang,
    version,
  } = request;

  const depositReq = {
    brandId,
    wins: [{ amount: parseMoney(cash), type: 'win' }, { amount: parseMoney(bonus), type: 'freespins' }],
    manufacturer: defaultConfiguration.manufacturerId,
    game: cat5,
    createGameRound: true,
    closeRound: last === 'Y',
    gameRoundId: reference,
    transactionId: `${reference}-${campaignref}`,
    sessionId: request.sessiontoken,
    timestamp: new Date(),
  };
  await api.win(playerId, depositReq);
  const { realBalance, bonusBalance, currencyId } = await api.getBalance(playerId);
  return {
    organization: configuration.brands[brandId].org,
    playerId: request.playerid,
    currency: currencyId,
    applicableBonus: formatMoney(bonusBalance),
    balance: formatMoney(realBalance),
    homeCurrency: currencyId,
  };
};

const cancelwager = async (request: CancelWagerRequest): Promise<CancelWagerResponse> => {
  const { brandId, playerId } = await getPlayerId(request);
  const {
    reference,
    subreference,
  } = request;
  await api.cancelTransaction(playerId, {
    brandId,
    manufacturer: defaultConfiguration.manufacturerId,
    transactionId: subreference,
    timestamp: new Date(),
  });
  const { realBalance, bonusBalance, currencyId } = await api.getBalance(playerId);
  return {
    organization: configuration.brands[brandId].org,
    playerId: request.playerid,
    currency: currencyId,
    balance: formatMoney(realBalance),
    bonus: formatMoney(bonusBalance),
  };
};

const playerinfo = async (request: PlayerinfoRequest): Promise<PlayerinfoResponse> => {
  try {
    const { player } = await api.getPlayerBySession(defaultConfiguration.manufacturerId, request.sessiontoken);
    return {
      gender: '',
      playerId: formatPlayerId(player),
      organization: configuration.brands[player.brandId].org,
      balance: formatMoney(player.realBalance),
      applicableBonus: formatMoney(player.bonusBalance),
      currency: player.currencyId,
      homeCurrency: player.currencyId,
      nickName: api.nickName(player),
      country: player.countryId,
      birthdate: player.dateOfBirth,
    };
  } catch (e) {
    return Promise.reject({ code: errors.NOT_LOGGED_IN, msg: 'Session not active' });
  }
};

const appendwagerresult = async (request: AppendWagerResultRequest): Promise<AppendWagerResultResponse> => {
  const { playerId, brandId } = await getPlayerId(request);
  const {
    org,
    playerid,
    amount,
    isJackpotWin,
    bonusprize,
    currency,
    reference,
    subreference,
    description,
    cat1,
    cat2,
    cat3,
    cat4,
    cat5,
    tag1,
    tag2,
    tag3,
    lang,
    version,
  } = request;

  const depositReq = {
    brandId,
    wins: [{ amount: parseMoney(amount), type: isJackpotWin ? 'jackpot' : 'win' }],
    manufacturer: defaultConfiguration.manufacturerId,
    game: cat5,
    createGameRound: false,
    closeRound: false,
    gameRoundId: reference,
    transactionId: subreference,
    sessionId: request.sessiontoken,
    timestamp: new Date(),
  };
  await api.win(playerId, depositReq);
  const { realBalance, bonusBalance, currencyId } = await api.getBalance(playerId);
  return {
    organization: configuration.brands[brandId].org,
    playerId: request.playerid,
    currency: currencyId,
    applicableBonus: formatMoney(bonusBalance),
    homeCurrency: currencyId,
    balance: formatMoney(realBalance),
    bonus: formatMoney(0),
  };
};

module.exports = {
  playerinfo,
  wager,
  cancelwager,
  appendwagerresult,
  endwager,
  campaignpayout,
  getbalance,
};
