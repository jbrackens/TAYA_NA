/* @flow */
import type { WebhookPayload, ProcessPaymentResponse, ProcessPaymentRequest, ProcessStandaloneCreditsRequest, ProcessStandaloneCreditsResponse, INeteller } from './types';

const { axios } = require('gstech-core/modules/axios');
const querystring = require('querystring');

const backend = require('gstech-core/modules/clients/backend-payment-api');

const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const { paysafe: paysafeConfig, neteller: netellerConfig } = config.providers.neteller;

const processPayment = async (payload: WebhookPayload) => {
  const deposit = await backend.getDepositAlt(payload.merchantRefNum);
  const { paymentHandleToken } = ((deposit.deposit.parameters): any);

  const { data: response } = await axios.post<ProcessPaymentRequest, ProcessPaymentResponse>(
    `${paysafeConfig.endpoint}/paymenthub/v1/payments`,
    {
      merchantRefNum: payload.merchantRefNum,
      amount: payload.amount,
      currencyCode: payload.currencyCode,
      dupCheck: true,
      settleWithAuth: true,
      paymentHandleToken,
    },
    {
      auth: { username: paysafeConfig.clientId, password: paysafeConfig.clientSecret },
    },
  );

  logger.debug('Paysafe: processPayment response', response);
};

const completePayment = async (payload: WebhookPayload, neteller?: INeteller) => {
  const { deposit } = await backend.getDepositAlt(payload.merchantRefNum);

  const player = await backend.details(deposit.username);

  let accountHolder = null;
  let content = null;
  let response = null;
  if (neteller != null) {
    try {
      const params = {
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth.replace(/-/g, ''),
        email: neteller.consumerId,
        postCode: player.postCode,
        country: player.countryId,
      };

      logger.debug('Neteller verification request', { params });
      const { data: authResponse } = await axios.request({
        url: `${netellerConfig.endpoint}/v1/oauth2/token?grant_type=client_credentials`,
        auth: { username: netellerConfig.clientId, password: netellerConfig.clientSecret },
      });
      response = (
        await axios.get(
          `${netellerConfig.endpoint}/v1/customers/verify?${querystring.stringify(params)}`,
          { headers: { Authorization: `Bearer ${authResponse.accessToken}` } },
        )
      ).data;

      logger.debug('Neteller verification response', { response });

      const [netellerVerified, paymentVerified] = response.verificationLevel.split('');

      if (netellerVerified === '1' && response.firstName === 'MATCH' && response.lastName === 'MATCH') {
        accountHolder = `${player.firstName} ${player.lastName}`;
      }
      content = `
  Automatic account verification via Neteller:
  - First name (${player.firstName}): ${response.firstName}
  - Last name (${player.lastName}): ${response.lastName}
  - Date of Birth (${player.dateOfBirth}): ${response.dateOfBirth}
  - Post code (${player.postCode}): ${response.postCode}
  - Country (${player.countryId}): ${response.country}
  - Account verified by Neteller: ${netellerVerified === '1' ? 'yes' : 'no'}
  - Payment method verified by Neteller: ${paymentVerified === '1' ? 'yes' : 'no'}
  `;
    } catch (e) {
      logger.warn('Neteller verification failed', e);
    }
  }

  const processDeposit = {
    amount: payload.amount,
    externalTransactionId: payload.id,
    account: neteller && neteller.consumerId ? neteller.consumerId : undefined,
    accountHolder,
    message: payload.status,
    rawTransaction: payload,
    status: 'settled',
  };

  const { accountId } = await backend.processDeposit(deposit.username, payload.merchantRefNum, processDeposit);

  if (content != null && response != null) {
    logger.debug('Adding Neteller payment method verification document', deposit.username, content);
    await backend.addDocument(deposit.username, { type: 'payment_method', content, source: 'Neteller', fields: response, accountId, status: accountHolder != null ? 'checked' : 'new' });
  }
};

const cancelPayment = async (payload: WebhookPayload) => {
  const data = {
    message: payload.status,
    rawTransaction: payload,
  };
  await backend.setDepositStatusAlt(payload.merchantRefNum, 'cancelled', data);
};

const processStandaloneCredit = async (payload: WebhookPayload) => {
  const { withdrawal } = await backend.getWithdrawalDetails(payload.merchantRefNum);
  const { paymentHandleToken } = ((withdrawal.paymentParameters): any);

  const { data: response } = await axios.post<
    ProcessStandaloneCreditsRequest,
    ProcessStandaloneCreditsResponse,
  >(
    `${paysafeConfig.endpoint}/paymenthub/v1/standalonecredits`,
    {
      merchantRefNum: payload.merchantRefNum,
      amount: payload.amount,
      currencyCode: payload.currencyCode,
      paymentHandleToken,
    },
    {
      auth: { username: paysafeConfig.clientId, password: paysafeConfig.clientSecret },
    },
  );

  logger.debug('Paysafe: processStandaloneCredit', response);
};

const completeStandaloneCredit = async (payload: WebhookPayload) => {
  const { withdrawal } = await backend.getWithdrawalDetails(payload.merchantRefNum);

  const complete = {
    externalTransactionId: payload.id,
    message: payload.status,
    rawTransaction: payload,
  };

  await backend.setWithdrawalStatus(withdrawal.username, payload.merchantRefNum, 'complete', complete);
};

const cancelStandaloneCredit = async (payload: WebhookPayload) => {
  const { withdrawal } = await backend.getWithdrawalDetails(payload.merchantRefNum);

  const cancel = {
    externalTransactionId: payload.id,
    message: payload.status,
    rawTransaction: payload,
  };
  await backend.setWithdrawalStatus(withdrawal.username, payload.merchantRefNum, 'failed', cancel);
};

const handler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Paysafe callback: ', req.body);

    const { data: response } = await axios.get(
      `${paysafeConfig.endpoint}/paymenthub/v1/paymenthandles?merchantRefNum=${req.body.payload.merchantRefNum}`,
      {
        auth: { username: paysafeConfig.clientId, password: paysafeConfig.clientSecret },
      },
    );
    logger.debug('Paysafe: get paymentHandle response', response);

    const { body: { eventType } } = req;
    const [{ transactionType, neteller }] = response.paymentHandles;

    if (eventType === 'PAYMENT_HANDLE_PAYABLE' && transactionType === 'PAYMENT') await processPayment(req.body.payload);
    if (eventType === 'PAYMENT_HANDLE_PAYABLE' && transactionType === 'STANDALONE_CREDIT') await processStandaloneCredit(req.body.payload);

    if (eventType === 'PAYMENT_HANDLE_COMPLETED' && transactionType === 'PAYMENT') await completePayment(req.body.payload, neteller);
    if (eventType === 'PAYMENT_HANDLE_COMPLETED' && transactionType === 'STANDALONE_CREDIT') await completeStandaloneCredit(req.body.payload);

    if ((eventType === 'PAYMENT_HANDLE_FAILED' || eventType === 'PAYMENT_HANDLE_EXPIRED') && transactionType === 'PAYMENT') await cancelPayment(req.body.payload);
    if ((eventType === 'PAYMENT_HANDLE_FAILED' || eventType === 'PAYMENT_HANDLE_EXPIRED') && transactionType === 'STANDALONE_CREDIT') await cancelStandaloneCredit(req.body.payload);

    return res.json({ ok: true });
  } catch (e) {
    logger.error('Paysafe callback failed', req.body.payload, e);
    return res.status(500).json({ ok: false });
  }
};

module.exports = {
  handler,
};
