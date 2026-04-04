/* @flow */
import type {
  WithdrawRequest,
  WithdrawResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi } from '../../types';

const moment = require('moment-timezone');

const { brands } = require('gstech-core/modules/constants');
const money = require('gstech-core/modules/money');
const slack = require('gstech-core/modules/slack');

const withdraw = async (wd: WithdrawRequest): Promise<WithdrawResponse> => {
  const { withdrawal, player, user } = wd;
  const brand = brands.find(b => b.id === wd.player.brandId);
  if (!brand) throw new Error(`Brand ${wd.player.brandId} is not found`);

  const log = {
    'Payment Method': withdrawal.paymentMethodName,
    'Payment Provider': withdrawal.paymentProvider,
    Created: user.handle,
    Date: moment.tz('Europe/Rome').format('DD.MM.YYYY'),
    Brand: brand.site,
    'User name': player.username,
    'Full name': `${player.firstName} ${player.lastName}`,
    Amount: money.formatMoney(withdrawal.amount),
    Currency: player.currencyId === 'EUR' ? '€' : player.currencyId,
    Account: withdrawal.account,
    'Transaction ID': withdrawal.paymentId,
    'Beneficiary Address': `${player.address} / ${player.postCode} ${player.city} / ${player.countryId}`,
    BIC: withdrawal.accountParameters ? withdrawal.accountParameters.bic : '',
  };

  await slack.paymentsManualMessage(brand.site, `Created new payment :moneybag: :${brand.site}:`, log);

  const result: WithdrawResponse = { ok: true, message: 'Manual withdrawal initiated', reject: false, id: String(withdrawal.paymentId), complete: true };
  return result;
};

const api: PaymentProviderApi = { withdraw };
module.exports = api;
