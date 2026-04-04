/* @flow */
import type {
  GetJackpotsRequest,
  GetJackpotsResponse,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { Player } from 'gstech-core/modules/types/player';

const _ = require('lodash');
const { promisify } = require('util');

const logger = require('gstech-core/modules/logger');
const { guard } = require('gstech-core/modules/utils');
const soap = require('soap');
const { userName, getConfiguration, defaultConfiguration } = require('../CasinoModule');

const jackpotMapping = {
  megafortune_not_mobile_sw: 'megajackpot1',
  hallofgods_not_mobile_sw: 'hog_large',
  godsoffortune_not_mobile_sw: 'gof_mega',
  goldmoneyfrog_not_mobile_sw: 'goldmoneyfrog3',
  imperialriches_not_mobile_sw: 'imperialriches_mega',
};

const getClient = (options: { endpoint: string, ... }) =>
  promisify(soap.createClient.bind(soap))(`${__dirname}/netent.wsdl`, options);

// eslint-disable-next-line no-unused-vars
const getUserName = (player: Player, brandId: BrandId) => userName(player);

// eslint-disable-next-line no-unused-vars
const ping = async (brandId: BrandId): Promise<{ ok: boolean }> => {
  const client = await getClient(defaultConfiguration);
  await new Promise((resolve, reject) =>
    client.ping({}, (err, res) => (err ? reject(err) : resolve(res))),
  );
  return Promise.resolve({ ok: true });
};

const creditFreeSpins = (
  user: Player,
  brandId: BrandId,
  promotionCode: string,
  id: string = promotionCode,
): any => {
  const conf = getConfiguration(user);
  const netentConfiguration = conf.brands[brandId];
  const { merchantId, merchantPassword } = netentConfiguration;
  logger.debug('creditFreeSpins', { promotionCode, id });
  return getClient(conf).then((client) => {
    const un = getUserName(user, brandId);
    const data = { userName: un, promotionCode, merchantId, merchantPassword };
    logger.debug('creditFreeSpins', { un, promotionCode, id }, data);

    return new Promise((resolve, reject) =>
      // eslint-disable-next-line no-promise-executor-return
      client.activateBonusProgramForPlayer(data, (err, result) => {
        if (err != null) {
          logger.error('creditFreeSpins failed', { un, promotionCode }, err);
          return reject((err != null ? err.message : undefined) || 'creditFreeSpins failed');
        }
        logger.debug('creditFreespins done', { un, promotionCode }, result);
        const res = _.first(
          _.castArray(
            guard(result, (x) => x.activateBonusProgramForPlayerReturn.bonusActivationDetailsArr),
          ),
        );
        logger.debug('creditFreespins done2', { un, promotionCode }, res);
        if (!(res != null ? res.activated : undefined)) {
          if (res && res.reason === 'Promotion code already used.') return resolve({ ok: true });
          logger.warn(
            `:bomb: ${user.username} NetEnt bonus ${promotionCode} activation failed: ${
              res ? res.reason : ''
            }`,
          );
          return reject((res != null ? res.reason : undefined) || promotionCode);
        }
        return resolve({ ok: true });
      }),
    );
  });
};

const getJackpots = async (
  brandId: BrandId,
  getJackpotsRequest: GetJackpotsRequest,
): Promise<GetJackpotsResponse> => {
  const jackpots: {
    game: string,
    currencies: {
      amount: string,
      currency: string,
    }[],
  }[] = await Promise.all(
    _.keys(jackpotMapping).map(async (id) => {
      const game = _.find(getJackpotsRequest.games, (x) => x.manufacturerGameId === id);
      if (game == null) {
        return ({}: any); // $FlowFixMe[prop-missing]
      }
      const allCurrencies = await Promise.all(
        getJackpotsRequest.currencies.map(async (currency) => {
          // $FlowFixMe[invalid-computed-prop]
          const jackpotId = jackpotMapping[game.manufacturerGameId];
          const client = await getClient(defaultConfiguration);
          const { merchantId, merchantPassword } = defaultConfiguration.brands[brandId];
          const x = await new Promise<any>((resolve, reject) =>
            client.getCurrentJackpot(
              _.extend({ jackpotId, currencyISOCode: currency }, { merchantId, merchantPassword }),
              (err, res) => (err ? reject(err) : resolve(res)),
            ),
          );
          const result = _.first(x.getCurrentJackpotReturn);
          return { amount: result.amount, currency: result.amountCurrencyISOCode };
        }),
      );
      const existingCurrencies = allCurrencies.filter((v) => Object.keys(v).length !== 0);
      const jackpot = { game: game.gameId, currencies: existingCurrencies };
      return jackpot;
    }),
  );

  return jackpots;
};

const getLeaderBoard = async (brandId: BrandId, tournamentOccurrenceId: string): Promise<any> => {
  const client = await getClient(defaultConfiguration);
  const { merchantId, merchantPassword } = defaultConfiguration.brands[brandId];
  const x = await new Promise<any>((resolve, reject) =>
    client.getLeaderBoard(
      _.extend({ tournamentOccurrenceId }, { merchantId, merchantPassword }),
      (err, res) => (err ? reject(err) : resolve(res)),
    ),
  );
  return x.getLeaderBoardReturn;
};

module.exports = { creditFreeSpins, ping, getJackpots, getLeaderBoard };
