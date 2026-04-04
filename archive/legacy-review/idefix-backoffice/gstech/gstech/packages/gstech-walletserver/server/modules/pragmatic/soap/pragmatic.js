/* @flow */
import type { CreditFreeSpinsResponse } from 'gstech-core/modules/clients/walletserver-api-types';
import type { Player } from 'gstech-core/modules/types/player';

const { toFormData } = require('axios');
const crypto = require('crypto');
const moment = require('moment-timezone');
const shortid = require('shortid');
const _ = require('lodash');
const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');
const { Money } = require('gstech-core/modules/money-class');
const { getJurisdiction } = require('../../jurisdiction');
const baseConfig = require('../../../../config');

const configuration = baseConfig.providers.pragmatic;

const md5 = (text: string) => crypto.createHash('md5').update(text).digest('hex');
const calculateHash = (params: any, config: { secretKey: string }) => {
  const k = _.sortBy(Object.keys(params));
  return md5(k.filter(key => key !== 'hash' && params[key] != null && params[key] !== '').map(key => `${key}=${params[key]}`).join('&') + config.secretKey);
};

const req = (r: | {
    bonusCode: string,
    currency: string,
    expirationDate: any,
    gameIDList: string,
    playerId: string,
    rounds: string,
    secureLogin: any,
  }
  | {
    bonusCode: string,
    expirationDate: any,
    rounds: string,
    secureLogin: any,
    startDate: any,
  }
  | { bonusCode: string, secureLogin: any }, c: any) => ({ ...r, hash: calculateHash(r, c) });

const creditFrbSpins = async (user: Player, id: string, gameId: string, rounds: string, pragmaticConfiguration: any, endpoint: string) => {
  const { secureLogin } = pragmaticConfiguration;
  const resid = shortid.generate();
  logger.debug('creditFrbSpins', resid, { gameId, rounds });
  const r = {
    method: 'POST',
    url: `https://${endpoint}/IntegrationService/v3/http/FreeRoundsBonusAPI/createFRB`,
    form: req({
      secureLogin,
      playerId: user.username,
      currency: user.currencyId,
      gameIDList: gameId,
      rounds,
      bonusCode: `${gameId}-${id}-${resid}`,
      expirationDate: moment().add(7, 'days').unix(),
    }, pragmaticConfiguration),
  };
  logger.debug('Credit pragmatic', r);
  const { data: resp } = await axios.request({
    ..._.omit(r, 'form'),
    data: toFormData(r.form),
  });
  if (resp.error !== '0') {
    return Promise.reject(resp.description);
  }

  logger.debug('Pragmatic credited', resid, resp);
  return resp;
};

const creditFullSpins = async (user: Player, id: string, gameId: string, rounds: string, amount: string, pragmaticConfiguration: any, endpoint: string) => {
  const { secureLogin } = pragmaticConfiguration;
  const resid = shortid.generate();
  const betPerLine = Number(new Money(amount, 'EUR').asCurrency(user.currencyId).asFloat());
  logger.debug('creditFullSpins', resid, { gameId, rounds, betPerLine });
  const bonusCode = `${gameId}-${id}-${resid}`;
  const r = {
    method: 'POST',
    url: `https://${endpoint}/IntegrationService/v3/http/FreeRoundsBonusAPI/v2/bonus/create`,
    data: {
      gameList: [{
        gameId,
        betValues: [{ betPerLine, currency: user.currencyId }],
      }],
    },
    params: req({
      secureLogin,
      rounds,
      bonusCode,
      startDate: moment().add(3, 'seconds').unix(),
      expirationDate: moment().add(7, 'days').unix(),
    }, pragmaticConfiguration),
  };
  logger.debug('Create bonusCode pragmatic', r);
  const { data: resp } = await axios.request(r);
  logger.debug('Pragmatic bonusCode created', resid, resp);
  if (resp.error !== '0') {
    return Promise.reject(resp.description);
  }

  const r2 = {
    method: 'POST',
    url: `https://${endpoint}/IntegrationService/v3/http/FreeRoundsBonusAPI/v2/players/add`,
    data: { playerList: [user.username] },
    params: req({
      secureLogin,
      bonusCode,
    }, pragmaticConfiguration),
  };
  logger.debug('Credited bonusCode pragmatic', r2);
  const { data: resp2 } = await axios.request(r2);
  logger.debug('Pragmatic bonusCode credited', resid, resp2);
  if (resp2.error !== '0') {
    return Promise.reject(resp2.description);
  }

  return resp2;
};

// eslint-disable-next-line no-promise-executor-return
const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const creditFreeSpins = async (user: Player, brandId: BrandId, promotionCode: string, id: string): Promise<CreditFreeSpinsResponse> => {  
  const brandConfig = getJurisdiction(user) === 'GNRS' ? configuration.germanBrands[brandId] : configuration.brands[brandId];
  if (!brandConfig) {
    throw new Error(`Pragmatic games are no configured for brand ${brandId} in ${user.countryId}`);
  }

  if (id == null) { id = promotionCode; } // eslint-disable-line no-param-reassign
  const [gameId, rounds, amount] = Array.from(promotionCode.split(','));
  const pragmaticConfiguration = brandConfig;
  if (amount == null) {
    await creditFrbSpins(user, id, gameId, rounds, pragmaticConfiguration, configuration.apiServer);
  } else {
    await creditFullSpins(user, id, gameId, rounds, amount, pragmaticConfiguration, configuration.apiServer);
  }
  await timeout(2500);
  return { ok: true };
};
module.exports = { creditFreeSpins };
