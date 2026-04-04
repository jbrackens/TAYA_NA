/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi } from '../../types';

const _ = require('lodash');
const qs = require('querystring');
const xmlescape = require('xml-escape');

const short = require('short-uuid');
const logger = require('gstech-core/modules/logger');
const { guard } = require('gstech-core/modules/utils');
const config = require('../../../config');

const paymentForm = require('../../shared/payment-form');
const { createRequest, doRequest, paymentMethods } = require('./utils');

const conf = config.providers.worldpay;


const translator = short();

const notificationUrl = (target: string) => config.server.public + target;

const depositInternal = async (
  depositRequest: DepositRequest,
  useToken: boolean = true,
): Promise<DepositResponse> => {
  logger.debug('startPayment fetchToken', depositRequest);
  const { transactionKey, paymentMethod } = depositRequest.deposit;
  const { player, urls, account, client } = depositRequest;

  // $FlowFixMe[invalid-computed-prop]
  const method = paymentMethods[paymentMethod];
  const shortId = method.shortId === true;

  const token = (account && account.parameters && account.parameters.token) || undefined;
  const createToken =
    token || !(method && method.token === true)
      ? ''
      : `\
<createToken tokenScope="shopper">
  <tokenEventReference>${xmlescape(transactionKey.replace(/-/g, '_'))}</tokenEventReference>
</createToken>`;

  const mapInclude = (x: string) => `<include code="${x}"/>`;

  const session = `<session shopperIPAddress="${client.ipAddress}" id="${transactionKey}"/>`;

  const paymentDetails = token
    ? `\
<paymentDetails>
  <TOKEN-SSL tokenScope="shopper">
    <paymentTokenID>${token}</paymentTokenID>
  </TOKEN-SSL>
  <storedCredentials usage="USED" />
      ${session}
</paymentDetails>\
`
    : `<paymentMethodMask>${
        method.token
          ? '<storedCredentials usage="FIRST" merchantInitiatedReason="UNSCHEDULED" />'
          : ''
      }${method.methods.map(mapInclude).join('')}</paymentMethodMask>`;

  const browser = `<browser>
  <acceptHeader>text/html</acceptHeader>
  <userAgentHeader>${xmlescape(client.userAgent)}</userAgentHeader>
</browser>`;

  const request = createRequest(
    conf.merchantCode,
    player,
    shortId ? translator.fromUUID(transactionKey) : transactionKey,
    transactionKey,
    depositRequest.deposit.amount,
    paymentDetails,
    `Deposit, ${player.email}`,
    createToken,
    browser,
  );

  logger.debug('Worldpay API request', request);
  const { reply, error, headers } = await doRequest(request);
  logger.debug('Worldpay API response', { reply, error, headers });

  if (error != null) {
    if (error === '5' || (useToken && error === '7')) {
      return depositInternal(depositRequest, false);
    }

    throw new Error(`Payment failed: ${error}`);
  }

  const errorCode = guard(reply, (r) => r.orderStatus[0].error[0]);
  const reqInfo = guard(reply, (r) => r.orderStatus[0].requestInfo[0]);
  const url = guard(reply, (r) => r.orderStatus[0].reference[0]._);

  if (errorCode != null) {
    throw new Error(`Payment failed: ${errorCode._}`);
  }

  const commonOptions: any = {
    language: player.languageId.toLowerCase(),
    country: player.countryId,
  };

  if (method.methods.length === 1) {
    commonOptions.preferredPaymentMethod = method.methods[0]; // eslint-disable-line prefer-destructuring
  }

  const linkOptions = {
    successURL: urls.ok,
    cancelURL: urls.failure,
    failureURL: urls.failure,
    pendingURL: urls.ok,
    errorURL: urls.failure,
  };

  if (reqInfo != null) {
    const request3DSecure = guard(reqInfo, (r) => r.request3DSecure[0], {});
    if (request3DSecure != null) {
      logger.debug('Worldpay request3DSecure', transactionKey, headers);
      const prm = qs.stringify({
        ...urls,
        cookie: headers && headers['set-cookie'] && headers['set-cookie'][0],
      });
      const TermUrl = notificationUrl(`/api/v1/worldpay/request/${transactionKey}?${prm}`);
      const PaReq = request3DSecure.paRequest != null ? request3DSecure.paRequest[0] : undefined;
      const issuerUrl = request3DSecure.issuerURL != null ? request3DSecure.issuerURL[0] : '';
      const MD = (request3DSecure.MD != null ? request3DSecure.MD[0] : undefined) || '';

      logger.debug('Create payment form:', { issuerUrl, TermUrl, PaReq, MD });
      const html = paymentForm.create(issuerUrl, { TermUrl, PaReq, MD });
      return {
        html,
        requiresFullscreen: true,
      };
    }
    return { url: urls.failure, requiresFullscreen: false }; // Should not ever happen
  }
  if (url == null) {
    return {
      url: urls.ok,
      requiresFullscreen: true,
    };
  }

  const paymentUrl = `${url}&${qs.stringify(_.extend({}, commonOptions, linkOptions))}`;
  logger.debug('Return payment url', { paymentUrl });
  return {
    url: paymentUrl,
    requiresFullscreen: true,
  };
};

const deposit = async (depositRequest: DepositRequest): Promise<DepositResponse> =>
  depositInternal(depositRequest);

const withdraw = async (withdrawRequest: WithdrawRequest): Promise<WithdrawResponse> => {
  const { player, withdrawal } = withdrawRequest;
  const { transactionKey } = withdrawRequest.withdrawal;

  const token = (withdrawal.accountParameters && withdrawal.accountParameters.token) || '';
  const paymentDetails = `<paymentDetails action="REFUND">
 <TOKEN-SSL tokenScope="shopper">
    <paymentTokenID>${token}</paymentTokenID>
 </TOKEN-SSL>
</paymentDetails>`;

  const body = createRequest(conf.withdraw.merchantCode, player, transactionKey, transactionKey, withdrawal.amount, paymentDetails, `Withdrawal, ${player.email}`);
  logger.debug('WorldPay WD request', body);
  const { reply, error } = await doRequest(body, {}, conf.withdraw);

  logger.debug('WorldPay WD response', reply, error);

  if (error && error.code) {
    return { ok: false, message: `Worldpay WD failed ${reply.error[0]._}` };
  }

  if (!reply) {
    return { ok: false, message: 'Invalid reply from WebDollar', reject: true, complete: true };
  }

  const orderId = guard(reply, r => r.ok[0].refundReceived[0].$.orderCode);
  if (!orderId) {
    return { ok: false, message: 'Invalid OrderID for withdrawal', reject: true, complete: true };
  }

  return { ok: true, message: 'WD submitted', reject: false, id: orderId, complete: true };
};

const api: PaymentProviderApi = { deposit, withdraw };
module.exports = api;
