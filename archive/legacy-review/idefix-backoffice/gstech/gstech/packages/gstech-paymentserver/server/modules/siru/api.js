/* @flow */
import type {
  DepositRequest,
  DepositResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi } from '../../types';

const { axios } = require('gstech-core/modules/axios');
const _ = require('lodash');

const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');

const config = require('../../../config');
const { calculateSignature, languageToLocale } = require('./utils');

const siruConfig = config.providers.siru;

const notificationUrl = (target: string) => config.server.public + target;

const deposit = async (depo: DepositRequest): Promise<DepositResponse> => {
  const brandedConfig = siruConfig.brands[depo.player.brandId];
  // $FlowFixMe[invalid-computed-prop]
  const cConf = brandedConfig.countries[depo.player.countryId];
  const variant = 'variant3';
  const form = {
    variant,
    merchantId: cConf.merchantId,
    submerchantReference: brandedConfig.site,
    purchaseCountry: depo.player.countryId,
    purchaseReference: depo.deposit.transactionKey,
    customerLastname: depo.player.lastName,
    customerFirstname: depo.player.firstName,
    customerEmail: depo.player.email,
    customerLocale: languageToLocale(depo.player),
    smsAfterSuccess: depo.player.mobilePhone,
    basePrice: money.formatMoney(depo.deposit.amount).toFixed(2),
    customerNumber: depo.player.mobilePhone,
    customerReference: depo.player.username,
    redirectAfterSuccess: depo.urls.ok,
    redirectAfterFailure: depo.urls.failure,
    redirectAfterCancel: depo.urls.failure,
    notifyAfterSuccess: notificationUrl(`/api/v1/siru/process/${depo.player.brandId}`),
    notifyAfterFailure: notificationUrl(`/api/v1/siru/process/${depo.player.brandId}`),
    notifyAfterCancel: notificationUrl(`/api/v1/siru/process/${depo.player.brandId}`),
  };
  logger.debug('form', form);
  if (variant === 'variant1') {
    _.extend(form, {
      taxClass: '0',
      serviceGroup: '2',
    });
  }

  const signatureFields = variant === 'variant1'
    ? 'variant,merchantId,submerchantReference,purchaseCountry,purchaseReference,customerReference,smsAfterSuccess,notifyAfterSuccess,notifyAfterFailure,notifyAfterCancel,basePrice,customerNumber,taxClass,serviceGroup'
    : 'variant,merchantId,submerchantReference,purchaseCountry,purchaseReference,customerReference,smsAfterSuccess,notifyAfterSuccess,notifyAfterFailure,notifyAfterCancel,basePrice';

  const body = _.extend({ signature: calculateSignature(form, cConf, _.sortBy(signatureFields.split(','))) }, form);

  const { data: response } = await axios.post(`${brandedConfig.endpoint}/payment.json`, body);
  if (response.errors) {
    throw Error(response.errors);
  }

  const result: DepositResponse = {
    requiresFullscreen: false,
    url: response.purchase.redirect,
  };

  return result;
};

const api: PaymentProviderApi = { deposit };
module.exports = api;
