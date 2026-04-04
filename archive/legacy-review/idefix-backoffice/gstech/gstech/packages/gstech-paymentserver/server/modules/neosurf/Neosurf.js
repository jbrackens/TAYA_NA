/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';

const crypto = require('crypto');
const { axios } = require('gstech-core/modules/axios');

const { brandDefinitions } = require('gstech-core/modules/constants');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const isTest = !config.isProduction;
const configuration = config.providers.neosurf;

const deposit = async (player: PlayerWithDetails, amount: Money, transactionKey: string, urls: URLFork): Promise<string> => {
  const brandInfo = brandDefinitions[player.brandId];

  const parameters = {
    amount,
    currency: player.currencyId.toLowerCase(),
    language: player.languageId,
    merchantId: configuration.merchantId,
    merchantTransactionId: transactionKey,
    prohibitedForMinors: 'yes',
    subMerchantId: brandInfo.url,
    test: isTest ? 'yes' : 'no',
    urlCallback: `${config.server.public}/api/v1/neosurf`,
    urlKo: urls.failure,
    urlOk: urls.ok,
    urlPending: urls.failure,
    version: 3,
  };

  const data = Object.values(parameters).map(v => v).join('') + configuration.secret;
  const hash = crypto.createHash('sha512').update(data).digest('hex');

  const options = {
    method: 'POST',
    url: configuration.apiUrl,
    params: { ...parameters, hash },
  };

  logger.debug('Neosurf deposit request:', options);
  const { data: response } = await axios.request(options);
  logger.debug('Neosurf deposit response:', response);

  return response;
};

module.exports = {
  deposit,
};
