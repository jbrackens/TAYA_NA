/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
  IdentifyRequest,
  IdentifyResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { Brand } from 'gstech-core/modules/types/backend';
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';

import type { PaymentProviderApi, ZimplerConfig } from '../../types';


const { axios } = require('gstech-core/modules/axios');

const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');
const sms = require('gstech-core/modules/sms');

const config = require('../../../config');

const zimplerConfig = config.providers.zimpler;

const doRequest = (options: any, merchantId: string, apiKey: string) => ({
  auth: {
    username: merchantId,
    password: apiKey,
  },
  ...options,
});

const createForm = (authId: string, action: string, okUrl: string, failureUrl: string, scriptLocation: string) => `
  <html>
    <head>
        <meta charset="utf-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0" />
    </head>
    <body style="margin: 0; padding: 0;">
        <div id="pugglepay-authorize"></div>
        <form method="POST" id="payForm_${authId}" target="_self" action="${action}">
        <input type="hidden" name="okUrl" value="${okUrl}"/>
        <input type="hidden" name="failureUrl" value="${failureUrl}"/>
        </form>
        <script src="${scriptLocation}"></script>
        <script type="text/javascript">Zimpler.authorize('${authId}', function() { document.getElementById('payForm_${authId}').submit(); });</script>
    </body>
  </html>`;


const createAuthorization = async (transactionKey: string, amount: Money, minDeposit: Money, details: PlayerWithDetails, brand: Brand, brandConfig: ZimplerConfig, type: 'login' | 'payment' = 'payment') => {
  const body = {
    method: 'web',
    type,
    payment: {
      ref: transactionKey,
      type: 'flexible_amount',
      requested_amount: money.asFloat(amount),
      requested_min_amount: money.asFloat(minDeposit),
      currency: details.currencyId,
    },
    locale: details.languageId.toLowerCase(),
    country: details.countryId,
    mobile_phone: `+${details.mobilePhone}`,
    email: details.email,
    site: brandConfig.url,
    account_ref: details.username,
    first_name: details.firstName,
    last_name: details.lastName,
    address_line_1: details.address,
    address_line_2: null,
    address_postcode: details.postCode,
    address_city: details.city,
    address_country: details.countryId,
    date_of_birth: details.dateOfBirth,
    is_kyc_performed: details.verified,
  };
  logger.debug('Zimpler createAuthorization form', body);

  const { data: auth } = await axios.request({
    method: 'POST',
    url: `${brandConfig.apiUrl}/v3/authorizations`,
    ...doRequest({ data: body }, brandConfig.merchantId, brandConfig.apiKey),
  });
  logger.debug('Zimpler authorization result', auth);
  return auth;
};

const deposit = async (depo: DepositRequest): Promise<DepositResponse> => {
  try {
    const { player, urls, params, brand } = depo;
    const d: any = depo.deposit; // FIXME minDeposit is there, but not in type
    const brandConfig: ZimplerConfig = zimplerConfig.brands[player.brandId];

    logger.debug('startPayment Zimpler', params, depo.deposit.transactionKey);
    const auth = await createAuthorization(depo.deposit.transactionKey, depo.deposit.amount, d.minDeposit, player, brand, brandConfig);
    const html = createForm(auth.id, `${config.server.public}/api/v1/zimpler/process/${player.brandId}/${auth.id}`, urls.ok, urls.failure, brandConfig.scriptLocation);

    const result: DepositResponse = {
      html,
      requiresFullscreen: false,
    };
    return result;
  } catch (e) {
    logger.error('Zimpler deposit failed', e);
    return {
      url: depo.urls.failure,
      requiresFullscreen: false,
    };
  }
};

const smsMessages = {
  en: 'Your withdrawal will be proceeded with Zimpler. Please follow the link to confirm your Zimpler account:',
  de: 'Deine Auszahlung mit Zimpler wird durchgeführt. Bitte folge dem Link um Dein Zimpler Konto zu bestätigen:',
  fi: 'Zimpler jatkaa kotiutuksesi käsittelyä. Klikkaa linkkiä vahvistaaksesi Zimpler-tilisi:',
  sv: 'Ditt uttag kommer fortsätta med Zimpler. Vänligen klicka på länken för att verifiera ditt Zimpler-konto:',
  no: 'Uttaket ditt vil viderebehandles med Zimpler. Vennligst følg denne lenken for å bekrefte din Zimpler-konto:',
};

const withdraw = async (wd: WithdrawRequest): Promise<WithdrawResponse> => {
  try {
    const { withdrawal, player } = wd;
    const brandConfig: ZimplerConfig = zimplerConfig.brands[player.brandId];
    const body = {
      approved_amount: money.asFloat(withdrawal.amount),
      currency: player.currencyId,
      user_id: withdrawal.accountParameters && withdrawal.accountParameters.zimplerId,
      ref: withdrawal.transactionKey,
      account_ref: player.username,
      site: brandConfig.url,
    };
    const { data: response } = await axios.request({
      method: 'POST',
      url: `${brandConfig.apiUrl}/v3/withdrawals/direct`,
      ...doRequest({ data: body }, brandConfig.merchantId, brandConfig.apiKey),
    });
    logger.debug('Zimpler withdraw', response);

    const isOk = response.state === 'approved' || response.state === 'pre-approved';
    if (response.user_form_url) {
      // $FlowFixMe[invalid-computed-prop]
      const msg = smsMessages[player.languageId] || smsMessages.en;
      const message = `${msg} ${response.user_form_url}`;
      const isSMSSent = await sms.send(wd.player.mobilePhone, message, { brandId: wd.player.brandId });

      return { ok: isOk, message: `${response.state}. ${message}`, id: response.id, complete: isSMSSent.ok };
    }

    return { ok: isOk, message: response.state, id: response.id };
  } catch (e) {
    logger.error('Zimpler withdrawal failed', e);
    return { ok: false, message: 'Check logs', reject: true };
  }
};

const identify = async (identifyRequest: IdentifyRequest): Promise<IdentifyResponse> => {  
  const { player, urls, brand } = identifyRequest;
  const brandConfig: ZimplerConfig = zimplerConfig.brands[player.brandId];

  const auth = await createAuthorization('', 0, 0, player, brand, brandConfig, 'login');
  const html = createForm(auth.id, `${config.server.public}/api/v1/zimpler/process/${player.brandId}/${auth.id}`, urls.ok, urls.failure, brandConfig.scriptLocation);
  const identifyResponse: any = {
    html,
    requiresFullscreen: false,
  };

  return identifyResponse;
};

const api: PaymentProviderApi = { deposit, withdraw, identify };
module.exports = api;
