/* @flow */
import type {
  DepositRequest,
  DepositResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi } from '../../types';

const qs = require('querystring')
const { axios } = require('gstech-core/modules/axios');
const iso = require('iso-3166-1');
const logger = require('gstech-core/modules/logger');

const config = require('../../../config');

const notificationUrl = (target: string) => config.server.public + target;

const deposit = async (depositRequest: DepositRequest): Promise<DepositResponse> => {
  const body = {
    Amount: depositRequest.deposit.amount, // TODO: check format!
    Uid: depositRequest.player.username,
    Tid: depositRequest.deposit.transactionKey,
    Email: depositRequest.player.email,
    Firstname: depositRequest.player.firstName,
    Lastname: depositRequest.player.lastName,
    ClientIp: depositRequest.client.ipAddress,
    Address: depositRequest.player.address,
    ZipCode: depositRequest.player.postCode,
    City: depositRequest.player.city,
    Country: iso.whereAlpha2(depositRequest.player.countryId).alpha3,
    Phone: `+${depositRequest.player.mobilePhone}`,
    BirthDate: depositRequest.player.dateOfBirth,
    OriginalAmount: depositRequest.deposit.amount, // TODO: check format!
    OriginalCurrency: depositRequest.player.currencyId,
    ConvertCurrency: 'yes',
    ReturnURL: notificationUrl('/api/v1/emp/process'),
  };

  const headers = {
    'EPRO-API-KEY': config.providers.emp.apiKey,
    'content-type': 'application/x-www-form-urlencoded'
  };

  logger.debug('emp api request', body);
  const { data: response } = await axios.request({
    method: 'POST',
    url: `${config.providers.emp.apiUrl}/api/payment/direct`,
    data: qs.stringify(body),
    headers,
  });

  logger.debug('emp api response', response);
  if (response.Code === 0) {
    if (response.Result['3DSecureUrl'] != null) {
      const result: DepositResponse = {
        requiresFullscreen: false,
        url: response.Result['3DSecureUrl'],
      };
      return result;
    }
  }

  logger.error('emp api request failed', response);
  const result: DepositResponse = {
    requiresFullscreen: false,
    url: depositRequest.urls.failure,
  };
  return result;
};

const api: PaymentProviderApi = { deposit };
module.exports = api;
